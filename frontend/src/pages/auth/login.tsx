//frontend/src/pages/auth/login.tsx

"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

import { AnimatePresence, motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password is required"),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });
  const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
  const router = useRouter();
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastError, setToastError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (data: LoginFormData) => {
    try {
      const res = await axios.post(
        `${BACKEND_BASE_URL}/api/auth/login`,
        {
          email: data.email,
          password: data.password,
          remember: data.rememberMe || false, // backend expects `remember`
        },
        {
          withCredentials: true, // ⬅️ IMPORTANT
        }
      );

      setToastError(false);
      setToastMsg("Login successful");
      setShowToast(true);

      setTimeout(() => {
        setShowToast(false);
        router.push("/dashboard");
        console.log("redirecting to dashboard...");
        
      }, 3000);
    } catch (err: any) {
      setToastError(true);
      setToastMsg(err.response?.data?.message || "Login failed");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 relative">
      {/* ✅ Toast Message */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`absolute top-4 right-4 px-6 py-4 rounded-lg shadow-lg z-50 w-72 ${
              toastError ? "bg-red-500 text-white" : "bg-white text-black"
            }`}
          >
            <div className="font-semibold">
              {toastError ? "❌ Error" : "✅ Success"}
            </div>
            <div className="text-sm mt-1">{toastMsg}</div>
            <div className="mt-2 h-1 w-full bg-gray-200 rounded overflow-hidden">
              <motion.div
                className={`h-full ${toastError ? "bg-white" : "bg-green-500"}`}
                initial={{ width: "100%" }}
                animate={{ width: 0 }}
                transition={{ duration: 3, ease: "linear" }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ✅ Login Form */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-card text-card-foreground border p-8 rounded-xl shadow-md w-full max-w-md space-y-6"
      >
        <h1 className="text-3xl font-bold text-center text-primary mb-2">
          TenderFlow.
        </h1>
        <h2 className="text-xl font-semibold text-center">Login</h2>

        {/* Email Field */}
        <div className="flex flex-col space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" placeholder="you@example.com" {...register("email")} />
          {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
        </div>

        {/* Password Field with Toggle */}
        <div className="flex flex-col space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="********"
              {...register("password")}
              className="pr-10"
            />
            <button
              type="button"
              className="absolute right-2 top-2.5 text-sm"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password && <p className="text-red-500 text-sm">{errors.password.message}</p>}
        </div>

        {/* Remember Me */}
        <div className="flex items-center space-x-2">
          <Checkbox id="rememberMe" onCheckedChange={(val) => setValue("rememberMe", !!val)} />
          <Label htmlFor="rememberMe">Remember Me</Label>
        </div>

        {/* Submit Button */}
        <Button type="submit" className="w-full">
          Login
        </Button>

        {/* Register Link */}
        <p className="text-sm text-center">
          Don’t have an account?{" "}
          <a href="/auth/register" className="text-primary font-medium hover:underline">
            Register
          </a>
        </p>
      </form>
    </div>
  );
}
