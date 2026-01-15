import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { RotatingBackground } from "@/components/ui/rotating-background";
import { albumCovers } from "@/lib/album-covers";

const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = loginSchema.extend({
  email: z.string().email("Please enter a valid email address"),
  musicService: z.enum(["spotify", "apple_music"]),
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
      musicService: "spotify",
    },
  });

  const onLoginSubmit = (data: LoginData) => {
    const normalized = {
      ...data,
      username: data.username.trim().toLowerCase(),
    };

    loginMutation.mutate(normalized, {
      onError: (error) => {
        toast({
          title: "Login failed",
          description:
            error.message || "Please check your credentials and try again",
          variant: "destructive",
        });
      },
    });
  };

  const onRegisterSubmit = (data: RegisterData) => {
    const normalized = {
      ...data,
      username: data.username.trim().toLowerCase(),
    };

    registerMutation.mutate(normalized, {
      onError: (error) => {
        toast({
          title: "Registration failed",
          description: error.message || "Please try with different credentials",
          variant: "destructive",
        });
      },
    });
  };

  if (user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden p-4 sm:p-0">
      <div className="absolute inset-0 z-0">
        <RotatingBackground images={albumCovers} intensity="medium" />
      </div>

      <div className="relative z-10 w-full max-w-md px-4 py-6 sm:py-8 bg-white/95 rounded shadow-lg">
        <h1 className="text-center text-2xl sm:text-3xl tracking-widest mb-8 sm:mb-12 font-mono">
          t h e&nbsp;&nbsp;s h e l f
        </h1>

        <div className="flex justify-center mb-4 sm:mb-6">
          <div className="inline-flex border border-black">
            <button
              type="button"
              className={`px-3 sm:px-4 py-1 text-sm sm:text-base ${
                isLogin ? "bg-[#a6ff96]" : "bg-white"
              }`}
              onClick={() => setIsLogin(true)}
            >
              login
            </button>
            <button
              type="button"
              className={`px-3 sm:px-4 py-1 text-sm sm:text-base ${
                !isLogin ? "bg-[#a6ff96]" : "bg-white"
              }`}
              onClick={() => setIsLogin(false)}
            >
              register
            </button>
          </div>
        </div>

        {isLogin ? (
          <form
            onSubmit={loginForm.handleSubmit(onLoginSubmit)}
            className="space-y-3 sm:space-y-4 border border-black p-4 sm:p-6"
          >
            <div className="space-y-1">
              <label className="text-xs sm:text-sm font-mono">username</label>
              <input
                {...loginForm.register("username")}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                inputMode="text"
                className="w-full p-1.5 sm:p-2 border border-black font-mono text-sm sm:text-base"
              />
              {loginForm.formState.errors.username && (
                <p className="text-xs text-red-500">
                  {loginForm.formState.errors.username.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs sm:text-sm font-mono">password</label>
              <input
                {...loginForm.register("password")}
                type="password"
                className="w-full p-1.5 sm:p-2 border border-black font-mono text-sm sm:text-base"
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
              className="w-full p-1.5 sm:p-2 border border-black font-mono text-sm sm:text-base bg-[#a6ff96] hover:bg-[#95e588] transition-colors"
            >
              {loginMutation.isPending ? "logging in..." : "login"}
            </button>
          </form>
        ) : (
          <form
            onSubmit={registerForm.handleSubmit(onRegisterSubmit)}
            className="space-y-3 sm:space-y-4 border border-black p-4 sm:p-6"
          >
            <div className="space-y-1">
              <label className="text-xs sm:text-sm font-mono">username</label>
              <input
                {...registerForm.register("username")}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                inputMode="text"
                className="w-full p-1.5 sm:p-2 border border-black font-mono text-sm sm:text-base"
              />
              {registerForm.formState.errors.username && (
                <p className="text-xs text-red-500">
                  {registerForm.formState.errors.username.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs sm:text-sm font-mono">email</label>
              <input
                {...registerForm.register("email")}
                type="email"
                className="w-full p-1.5 sm:p-2 border border-black font-mono text-sm sm:text-base"
              />
              {registerForm.formState.errors.email && (
                <p className="text-xs text-red-500">
                  {registerForm.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs sm:text-sm font-mono">password</label>
              <input
                {...registerForm.register("password")}
                type="password"
                className="w-full p-1.5 sm:p-2 border border-black font-mono text-sm sm:text-base"
              />
              {registerForm.formState.errors.password && (
                <p className="text-xs text-red-500">
                  {registerForm.formState.errors.password.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs sm:text-sm font-mono">
                default music service
              </label>
              <select
                {...registerForm.register("musicService")}
                className="w-full p-1.5 sm:p-2 border border-black font-mono text-sm sm:text-base bg-white"
              >
                <option value="spotify">spotify</option>
                <option value="apple_music">apple music</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={registerMutation.isPending}
              className="w-full p-1.5 sm:p-2 border border-black font-mono text-sm sm:text-base bg-[#a6ff96] hover:bg-[#95e588] transition-colors"
            >
              {registerMutation.isPending ? "creating account..." : "register"}
            </button>
          </form>
        )}

        <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-200 text-center">
          <p className="text-xs sm:text-sm text-gray-600 px-2 sm:px-4 font-mono leading-relaxed">
            <span className="font-semibold">
              eliminate album decision paralysis.
            </span>
            <br />
            the shelf is designed to help you decide what music to listen to.
            organize your albums, build your listening queue, and track your
            no-skips collection.
          </p>
          <p className="text-xs text-gray-500 mt-2 sm:mt-3 italic font-mono">
            © 2025 the shelf
          </p>
        </div>
      </div>
    </div>
  );
}
