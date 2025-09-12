//frontend/src/pages/auth/login.tsx

"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { motion, AnimatePresence } from "framer-motion";

// ✅ Updated schema with "none" support
const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
const registerSchema = z.object({
  fullName: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  companyId: z
    .string()
    .transform((val) => (val === "none" ? undefined : Number(val)))
    .optional(),
});

type RegisterFormData = z.infer<typeof registerSchema>;
type CompanyOption = { id: number; name: string };

export default function RegisterPage() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [hasMounted, setHasMounted] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("none");

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    async function fetchCompanies() {
      try {
        const res = await axios.get(`${BACKEND_BASE_URL}/api/companies/select`);
        setCompanies(res.data.companies);
      } catch (err) {
        console.error("Error fetching companies:", err);
      }
    }
    fetchCompanies();
  }, []);

  const onSubmit = async (data: RegisterFormData) => {
    try {
      console.log("submitting:", data);

      await axios.post(`${BACKEND_BASE_URL}/api/auth/signup`, data);
      setToast({ type: "success", message: "Signup Successful" });

      setTimeout(() => {
        setToast(null);
        router.push("/auth/login");
      }, 4000);
    } catch (err: any) {
      setToast({ type: "error", message: err.response?.data?.message || "Registration failed" });
      setTimeout(() => setToast(null), 4000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 relative">
      {hasMounted && (
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`absolute top-4 right-4 px-6 py-4 rounded-lg shadow-lg z-50 w-72 ${
                toast.type === "success" ? "bg-white text-black" : "bg-red-600 text-white"
              }`}
            >
              <div className="font-semibold">
                {toast.type === "success" ? "✅ " : "❌ "} {toast.message}
              </div>
              <div className="mt-2 h-1 w-full bg-gray-300 rounded overflow-hidden">
                <motion.div
                  className={`h-full ${toast.type === "success" ? "bg-green-500" : "bg-white"}`}
                  initial={{ width: "100%" }}
                  animate={{ width: 0 }}
                  transition={{ duration: 4, ease: "linear" }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-card text-card-foreground border p-8 rounded-xl shadow-md w-full max-w-md space-y-6"
      >
        <h1 className="text-3xl font-bold text-center text-primary mb-2 tracking-tight">
          TenderFlow.
        </h1>
        <h2 className="text-xl font-semibold text-center">SignUp</h2>

        <div className="flex flex-col space-y-2">
          <Label htmlFor="fullName">Full Name</Label>
          <Input id="fullName" placeholder="Your name" {...register("fullName")} />
          {errors.fullName && <p className="text-red-500 text-sm">{errors.fullName.message}</p>}
        </div>

        <div className="flex flex-col space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" placeholder="you@example.com" {...register("email")} />
          {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
        </div>

        <div className="flex flex-col space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" placeholder="********" {...register("password")} />
          {errors.password && <p className="text-red-500 text-sm">{errors.password.message}</p>}
        </div>

        <div className="flex flex-col space-y-2 w-full">
          <Label>Select a Company (optional)</Label>
          <Select
            value={selectedCompanyId}
            onValueChange={(value: string) => {
              setSelectedCompanyId(value);
              setValue("companyId", value);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a company (or skip)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {companies.map((company) => (
                <SelectItem key={company.id} value={String(company.id)}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button type="submit" className="w-full">
          Register
        </Button>

        <div className="text-center mt-2">
          <Link href="/auth/login">
            <Button variant="outline" className="w-full mt-2">
              Already have an account? Log in
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
