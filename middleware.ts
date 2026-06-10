import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: { signIn: "/login" },
  callbacks: { authorized: ({ token }) => Boolean(token) },
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/products/:path*",
    "/categories/:path*",
    "/units/:path*",
    "/warehouses/:path*",
    "/locations/:path*",
    "/stock/:path*",
    "/movements/:path*",
    "/physical-inventory/:path*",
    "/imports/:path*",
    "/reports/:path*",
    "/users/:path*",
    "/settings/:path*",
    "/audit/:path*",
  ],
};
