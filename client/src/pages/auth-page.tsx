import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = loginSchema.extend({
  email: z.string().email("Please enter a valid email address"),
});

type LoginData = z.infer<typeof loginSchema>;
type RegisterData = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const { user, loginMutation, registerMutation } = useAuth();
  const { toast } = useToast();

  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
    },
  });

  const onLoginSubmit = (data: LoginData) => {
    loginMutation.mutate(data, {
      onError: (error) => {
        toast({
          title: "Login failed",
          description: error.message || "Please check your credentials and try again",
          variant: "destructive",
        });
      },
    });
  };

  const onRegisterSubmit = (data: RegisterData) => {
    registerMutation.mutate(data, {
      onError: (error) => {
        toast({
          title: "Registration failed",
          description: error.message || "Please try with different credentials",
          variant: "destructive",
        });
      },
    });
  };

  // Redirect if already logged in
  if (user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
      <div className="w-full max-w-md">
        <h1 className="text-center text-3xl tracking-widest mb-16 font-mono">
          t h e&nbsp;&nbsp;s h e l f
        </h1>

        <div className="flex justify-center mb-6">
          <div className="inline-flex border border-black">
            <button
              className={`px-4 py-1 ${isLogin ? 'bg-[#a6ff96]' : 'bg-white'}`}
              onClick={() => setIsLogin(true)}
            >
              login
            </button>
            <button
              className={`px-4 py-1 ${!isLogin ? 'bg-[#a6ff96]' : 'bg-white'}`}
              onClick={() => setIsLogin(false)}
            >
              register
            </button>
          </div>
        </div>

        {isLogin ? (
          <form
            onSubmit={loginForm.handleSubmit(onLoginSubmit)}
            className="space-y-4 border border-black p-6"
          >
            <div className="space-y-1">
              <label className="text-sm font-mono">
                username
              </label>
              <input
                {...loginForm.register("username")}
                className="w-full p-2 border border-black font-mono"
              />
              {loginForm.formState.errors.username && (
                <p className="text-xs text-red-500">
                  {loginForm.formState.errors.username.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-mono">
                password
              </label>
              <input
                {...loginForm.register("password")}
                type="password"
                className="w-full p-2 border border-black font-mono"
              />
              {loginForm.formState.errors.password && (
                <p className="text-xs text-red-500">
                  {loginForm.formState.errors.password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full p-2 border border-black font-mono bg-[#a6ff96] hover:bg-[#95e588] transition-colors"
            >
              {loginMutation.isPending ? "logging in..." : "login"}
            </button>
          </form>
        ) : (
          <form
            onSubmit={registerForm.handleSubmit(onRegisterSubmit)}
            className="space-y-4 border border-black p-6"
          >
            <div className="space-y-1">
              <label className="text-sm font-mono">
                username
              </label>
              <input
                {...registerForm.register("username")}
                className="w-full p-2 border border-black font-mono"
              />
              {registerForm.formState.errors.username && (
                <p className="text-xs text-red-500">
                  {registerForm.formState.errors.username.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-mono">
                email
              </label>
              <input
                {...registerForm.register("email")}
                type="email"
                className="w-full p-2 border border-black font-mono"
              />
              {registerForm.formState.errors.email && (
                <p className="text-xs text-red-500">
                  {registerForm.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-mono">
                password
              </label>
              <input
                {...registerForm.register("password")}
                type="password"
                className="w-full p-2 border border-black font-mono"
              />
              {registerForm.formState.errors.password && (
                <p className="text-xs text-red-500">
                  {registerForm.formState.errors.password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={registerMutation.isPending}
              className="w-full p-2 border border-black font-mono bg-[#a6ff96] hover:bg-[#95e588] transition-colors"
            >
              {registerMutation.isPending ? "creating account..." : "register"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}