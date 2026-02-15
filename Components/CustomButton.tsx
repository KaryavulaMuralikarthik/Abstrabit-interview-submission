import { ComponentProps } from "react";

type Variant = "default" | "success" | "danger";

type CustomButtonProps = ComponentProps<"button"> & {
  variant?: Variant;
};

export default function CustomButton({
  children,
  variant = "default",
  className = "",
  ...props
}: CustomButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center px-5 py-2.5 rounded-xl font-medium transition-all duration-200 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed";

  const variantStyles: Record<Variant, string> = {
    default:
      "bg-accent text-white hover:shadow-lg hover:shadow-accent/25",

    success:
      "bg-emerald-500 text-white hover:bg-emerald-600 hover:shadow-md",

    danger:
      "bg-rose-500 text-white hover:bg-rose-600 hover:shadow-md",
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${className} cursor-pointer`}
      {...props}
    >
      {children}
    </button>
  );
}
