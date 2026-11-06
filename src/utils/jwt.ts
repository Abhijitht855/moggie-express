// src/utils/jwt.ts
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types/index';

export const generateTokens = (payload: JwtPayload) => {
  const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET!, { expiresIn: '15m' });
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

export const sendRefreshTokenCookie = (res: Response, token: string, req: Request) => {
  const origin = req.headers.origin || "";
  
  const cookieOptions: any = {
    httpOnly: true,
    secure: true, 
    sameSite: 'none', 
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };

  if (origin && !origin.includes('localhost')) {
    cookieOptions.domain = process.env.COOKIE_DOMAIN || '.moggieattires.com';
  }

  console.log(`🍪 Setting cookie for origin: ${origin}`); 
  res.cookie('refreshToken', token, cookieOptions);
};
