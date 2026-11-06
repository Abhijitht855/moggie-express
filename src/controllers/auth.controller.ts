import { Request, Response } from 'express';
import User from '../models/User';
import Otp from '../models/Otp';
import { generateTokens, sendRefreshTokenCookie } from '../utils/jwt';
import { validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types/index';
import { sendOTPEmail } from '../utils/mail';

/**
 * @desc    Request OTP (Sends 6-digit OTP to email, no User record created yet)
 * @route   POST /api/auth/request-otp
 */
export const requestOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const { email: rawEmail, forAdmin } = req.body;
    const email = rawEmail.toLowerCase().trim();

    // If requested from Admin Portal, verify this email belongs to an Admin BEFORE sending OTP
    if (forAdmin === true || forAdmin === 'true') {
      const user = await User.findOne({ email });
      if (!user || user.role !== 'admin') {
        res.status(403).json({
          success: false,
          message: 'Access Denied: No administrator account associated with this email.',
        });
        return;
      }
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store temporary OTP in Otp collection with TTL (10 minutes).
    // IMPORTANT: No unverified User record is created in the database yet!
    await Otp.findOneAndUpdate(
      { email },
      { otp, createdAt: new Date() },
      { upsert: true, new: true }
    );

    console.log(`[AUTH] 🔑 Generated OTP for ${email}: ${otp}`);

    await sendOTPEmail(email, otp);
    res.json({ success: true, message: 'OTP sent to email' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error sending OTP' });
  }
};

/**
 * @desc    Unified Login & First-time Verification
 *          (If user doesn't exist, automatically creates user as 'Guest User')
 * @route   POST /api/auth/login
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const email = req.body.email.toLowerCase().trim();
    const { otp, name, forAdmin } = req.body;

    // 1. Verify OTP from Otp collection
    const otpRecord = await Otp.findOne({ email, otp });

    if (!otpRecord) {
      res.status(401).json({ success: false, message: 'Invalid or expired OTP' });
      return;
    }

    // 2. Delete used OTP immediately
    await Otp.deleteOne({ _id: otpRecord._id });

    // 3. Find or Create User
    let user = await User.findOne({ email });

    if (forAdmin === true || forAdmin === 'true') {
      if (!user || user.role !== 'admin') {
        res.status(403).json({
          success: false,
          message: 'Access Denied: You do not have administrator permissions.',
        });
        return;
      }
    }

    if (!user) {
      // First-time user verified: Now save to database!
      user = await User.create({
        email,
        name: name?.trim() || 'Guest User',
        role: 'user',
      });
    }

    const { accessToken, refreshToken } = generateTokens({
      _id: user._id.toString(),
      role: user.role,
    });

    sendRefreshTokenCookie(res, refreshToken, req);

    res.json({
      success: true,
      message: 'Login successful',
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

/**
 * @desc    Register new user (Optional alias for login with explicit name)
 * @route   POST /api/auth/register
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  return login(req, res);
};

/**
 * @desc    Update User Profile (Name, etc.)
 * @route   PUT /api/auth/profile
 * @access  Private
 */
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.body;
    const user = await User.findById(req.user!._id);

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    if (name && name.trim()) {
      user.name = name.trim();
    }

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

/**
 * @desc    Refresh Access Token
 * @route   POST /api/auth/refresh-token
 */
export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = req.cookies.refreshToken;

    if (!token) {
      res.status(401).json({ message: 'Not authenticated, no refresh token' });
      return;
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_REFRESH_SECRET as string
    ) as JwtPayload;

    const tokens = generateTokens({ _id: decoded._id, role: decoded.role });

    sendRefreshTokenCookie(res, tokens.refreshToken, req);

    res.json({ accessToken: tokens.accessToken });
  } catch (error) {
    res.status(403).json({ message: 'Invalid or expired refresh token' });
  }
};

/**
 * @desc    Logout User / Clear Cookie
 * @route   POST /api/auth/logout
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  const isProduction = process.env.NODE_ENV === 'production';
  const origin = req.headers.origin || '';

  const cookieOptions: any = {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/',
  };

  if (isProduction && !origin.includes('localhost')) {
    cookieOptions.domain = process.env.COOKIE_DOMAIN || '.moggieattires.com';
  }

  res.clearCookie('refreshToken', cookieOptions);
  res.json({ success: true, message: 'Logged out successfully' });
};

/**
 * @desc    Get Current User Profile
 * @route   GET /api/auth/me
 */
export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user?._id).select('-password');
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

/**
 * @desc    Get All Users
 * @route   GET /api/auth/users
 * @access  Private/Admin
 */
export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

// ─── ADDRESS MANAGEMENT ──────────────────────────────────────────────────────

// 1. ADD NEW ADDRESS
export const addAddress = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user!._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { firstName, address, phone, postalCode } = req.body;
    if (!firstName || !address || !phone || !postalCode) {
      return res.status(400).json({
        message: 'firstName, address, phone, and postalCode are required',
      });
    }

    const hasDefault = user.addresses.some((addr) => addr.isDefault);
    const newAddress = { ...req.body, isDefault: !hasDefault };

    user.addresses.push(newAddress as any);
    await user.save();
    res.status(201).json(user.addresses);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// 2. SET DEFAULT ADDRESS
export const setDefaultAddress = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user!._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { addressId } = req.params;
    const addressToSet = (user.addresses as any).id(addressId);

    if (!addressToSet) {
      return res.status(404).json({ message: 'Address not found or already deleted' });
    }

    user.addresses.forEach((addr: any) => {
      addr.isDefault = addr._id.toString() === addressId;
    });

    await user.save();
    res.json(user.addresses);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// 3. DELETE ADDRESS
export const deleteAddress = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user!._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { addressId } = req.params;
    const addressToDelete = (user.addresses as any).id(addressId);

    if (!addressToDelete) {
      return res.status(404).json({ message: 'Address already deleted' });
    }

    const wasDefault = addressToDelete.isDefault;
    (user.addresses as any).pull(addressId);

    if (wasDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }

    await user.save();
    res.json({ message: 'Address removed successfully', addresses: user.addresses });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// 4. UPDATE ADDRESS
export const updateAddress = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user!._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { addressId } = req.params;
    const { firstName, lastName, address, city, state, postalCode, phone } = req.body;

    const existingAddress = (user.addresses as any).id(addressId);
    if (!existingAddress) {
      return res.status(404).json({ message: 'Address not found' });
    }

    if (firstName) existingAddress.firstName = firstName;
    if (lastName) existingAddress.lastName = lastName;
    if (address) existingAddress.address = address;
    if (city) existingAddress.city = city;
    if (state) existingAddress.state = state;
    if (postalCode) existingAddress.postalCode = postalCode;
    if (phone) existingAddress.phone = phone;

    await user.save();

    res.json({
      success: true,
      message: 'Address updated successfully',
      addresses: user.addresses,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
