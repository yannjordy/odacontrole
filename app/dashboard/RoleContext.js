'use client';
import { createContext, useContext } from 'react';

export const RoleContext = createContext({ user: null, role: null, isAdmin: false, isViewer: false });
export function useRole() { return useContext(RoleContext); }

export const ADMIN_ROLES = ['super_admin', 'admin'];
export const VIEWER_ROLES = ['viewer'];
