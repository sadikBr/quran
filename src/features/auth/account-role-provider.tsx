"use client";

import { createContext, useContext } from "react";

const AdminContext = createContext(false);
const AuthenticatedContext = createContext(false);
export const useIsPlatformAdmin = () => useContext(AdminContext);
export const useIsAuthenticated = () => useContext(AuthenticatedContext);
export function AccountRoleProvider({
    isAdmin,
    isAuthenticated,
    children,
}: {
    isAdmin: boolean;
    isAuthenticated: boolean;
    children: React.ReactNode;
}) {
    return (
        <AuthenticatedContext.Provider value={isAuthenticated}>
            <AdminContext.Provider value={isAdmin}>
                {children}
            </AdminContext.Provider>
        </AuthenticatedContext.Provider>
    );
}
