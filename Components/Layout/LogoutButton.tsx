"use client";

import { createClient } from "@/lib/client/supabaseClient";
import CustomButton from "../CustomButton";

export default function LogoutButton() {
  const handleLogout = async () => {
  const supabase = await createClient();

    const { error } = await supabase.auth.signOut();

    console.log("Logout result:", error);

    if (!error) {
      window.location.href = "/login";
    }
  };
  return (
    <CustomButton onClick={handleLogout} className="p-3 transition rounded-sm">
      Log Out
    </CustomButton>
  );
}
