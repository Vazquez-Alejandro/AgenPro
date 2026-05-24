"use client";

import dynamic from "next/dynamic";

const NavbarContent = dynamic(() => import("./NavbarContent"), { ssr: false });

export default function Navbar() {
  return <NavbarContent />;
}
