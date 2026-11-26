"use client";

import { createContext, useContext } from "react";

// True when Sheza (owner) or the superadmin is playing. The game wraps its
// popups in this, so a piece of popup content (like the jukebox) can show
// owner-only tools even though the content itself is rendered on the server.
export const CanAdminContext = createContext(false);
export const useCanAdmin = () => useContext(CanAdminContext);
