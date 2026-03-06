import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
        <div className="flex-1 flex flex-col min-h-0 bg-white p-8 md:p-12 lg:p-16">
          <div className="flex-1 flex flex-col min-h-0 overflow-visible">{children}</div>
        </div>
        <div className="hidden lg:block lg:w-1/2 relative overflow-hidden bg-gray-100">
        <Image
          src="/login-banner.jpg"
          alt=""
          fill
          priority
          sizes="50vw"
          className="object-cover object-center"
          quality={95}
        />
      </div>
      </div>
  );
}
