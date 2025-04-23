import Logo from "@/components/ui/logo";
import ConnectButton from "./ConnectButton";
import { Link } from "react-router-dom";
import { JSX } from "react";

export default function Navbar(): JSX.Element {
  return (
    <nav className="sticky top-4 flex items-center justify-between py-3 px-5 rounded-full mt-4 w-full max-w-[1200px] mx-auto bg-gray-600/20 backdrop-blur-lg z-[100]">
      <Link to="/">
        <Logo className="w-[150px] h-[50px]" />
      </Link>
      <ConnectButton/>
    </nav>
  );
}
