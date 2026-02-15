import LogoutButton from "./LogoutButton";
export default async function Navbar() {
  return (
    <div>
      <div className="fixed bg-white top-0 w-full flex items-center px-5 justify-between h-20">
        <p className="text-xl lg:text-2xl tracking-widest text-muted">
          Bookmark Manager
        </p>{" "}
        <LogoutButton />
      </div>
    </div>
  );
}
