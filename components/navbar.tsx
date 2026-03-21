import { UserButton } from "@clerk/nextjs";
import MobileSidebar from "@/components/mobile-sidebar";
import Link from "next/link";

const Navbar = () => {
    return (
        <div className="flex items-center p-4">
            <MobileSidebar />
            <Link href="/dashboard" className="md:hidden ml-2">
                <span className="text-xl font-bold bg-gradient-to-r from-violet-500 to-pink-500 text-transparent bg-clip-text">
                    lumin.ai
                </span>
            </Link>
            <div className="flex w-full justify-end">
                <UserButton afterSignOutUrl="/" />
            </div>
        </div>
    );
}

export default Navbar;
