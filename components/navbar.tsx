import { UserButton } from "@clerk/nextjs";
import MobileSidebar from "@/components/mobile-sidebar";
import Link from "next/link";

const Navbar = () => {
    return (
        <div className="flex items-center p-4">
            <MobileSidebar />
            <Link href="/dashboard" className="md:hidden ml-2">
                <span className="text-xl font-bold bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-400 text-transparent bg-clip-text">
                    Lumin.ai
                </span>
            </Link>
            <div className="flex w-full justify-end">
                <UserButton afterSignOutUrl="/" />
            </div>
        </div>
    );
}

export default Navbar;
