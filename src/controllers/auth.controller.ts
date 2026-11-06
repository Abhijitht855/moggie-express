import { Request, Response } from 'express';
import User from '../models/User';
import { generateTokens, sendRefreshTokenCookie } from '../utils/jwt';
import { validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types/index';
import { sendOTPEmail } from '../utils/mail';

/**
 * @desc    Request OTP (Handles both login and registration initiation)
 */
export const requestOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const { email } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    const user = await User.findOne({ email });

    if (user) {
      user.otp = otp;
      user.otpExpires = otpExpires;
      await user.save();
    } else {
      await User.create({
        email,
        otp,
        otpExpires,
        name: 'Guest User'
      });
    }

    await sendOTPEmail(email, otp);
    res.json({ success: true, message: 'OTP sent to email' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error sending OTP' });
  }
};

/**
 * @desc    Register new user (OTP Only)
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const { name, email, otp } = req.body;

    const user = await User.findOne({ email }).select('+otp +otpExpires');

    if (!user || user.otp !== otp || (user.otpExpires && user.otpExpires < new Date())) {
      res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
      return;
    }

    user.name = name;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    const { accessToken, refreshToken } = generateTokens({ _id: user._id.toString(), role: user.role });
    sendRefreshTokenCookie(res, refreshToken, req);

    res.status(201).json({
      success: true,
      message: 'Registered successfully',
      accessToken,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
};

/**
 * @desc    Login user with OTP only
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const { email, otp } = req.body;

    const user = await User.findOne({ email }).select('+otp +otpExpires');

    if (!user) {
      res.status(401).json({ success: false, message: 'User not found. Please register.' });
      return;
    }

    if (!user.otp || user.otp !== otp || (user.otpExpires && user.otpExpires < new Date())) {
      res.status(401).json({ success: false, message: 'Invalid or expired OTP' });
      return;
    }

    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    const { accessToken, refreshToken } = generateTokens({
      _id: user._id.toString(),
      role: user.role
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
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @desc    Refresh Access Token
 * @route   POST /api/auth/refresh-token
 */
export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log("--- Refresh Token Debug ---");
    console.log("Headers Cookie:", req.headers.cookie); // Raw cookie string
    console.log("Parsed Cookies:", req.cookies); // Parsed by cookie-parser
    
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
  const origin = req.headers.origin || "";

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
 * @desc    Get Current User
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

// 1. ADD NEW ADDRESS
export const addAddress = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user!._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { firstName, address, phone, postalCode } = req.body;
    if (!firstName || !address || !phone || !postalCode) {
      return res.status(400).json({
        message: 'firstName, address, phone, postalCode എന്നിവ നിർബന്ധമാണ്'
      });
    }

    const hasDefault = user.addresses.some(addr => addr.isDefault);
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

// 4. UPDATE ADDRESS (EDIT)
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
      addresses: user.addresses
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};