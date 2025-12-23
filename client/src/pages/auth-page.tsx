import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { RotatingBackground } from "@/components/ui/rotating-background";
import { albumCovers } from "@/lib/album-covers";
import { AppleMusicConnect } from "@/components/ui/apple-music-connect";

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

  const musicService = registerForm.watch("musicService");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden p-4 sm:p-0">
      {/* Random album background (changes on page refresh) */}
      <div className="absolute inset-0 z-0">
        <RotatingBackground images={albumCovers} intensity="medium" />
      </div>

      {/* Content overlay with slight transparency */}
      <div className="relative z-10 w-full max-w-md px-4 py-6 sm:py-8 bg-white/95 rounded shadow-lg">
        <h1 className="text-center text-2xl sm:text-3xl tracking-widest mb-8 sm:mb-12 font-mono">
          t h e&nbsp;&nbsp;s h e l f
        </h1>

        <div className="flex justify-center mb-4 sm:mb-6">
          <div className="inline-flex border border-black">
            <button
              className={`px-3 sm:px-4 py-1 text-sm sm:text-base ${isLogin ? 'bg-[#a6ff96]' : 'bg-white'}`}
              onClick={() => setIsLogin(true)}
            >
              login
            </button>
            <button
              className={`px-3 sm:px-4 py-1 text-sm sm:text-base ${!isLogin ? 'bg-[#a6ff96]' : 'bg-white'}`}
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
              <label className="text-xs sm:text-sm font-mono">
                username
              </label>
              <input
                {...loginForm.register("username")}
                className="w-full p-1.5 sm:p-2 border border-black font-mono text-sm sm:text-base"
              />
              {loginForm.formState.errors.username && (
                <p className="text-xs text-red-500">
                  {loginForm.formState.errors.username.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs sm:text-sm font-mono">
                password
              </label>
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
              <label className="text-xs sm:text-sm font-mono">
                username
              </label>
              <input
                {...registerForm.register("username")}
                className="w-full p-1.5 sm:p-2 border border-black font-mono text-sm sm:text-base"
              />
              {registerForm.formState.errors.username && (
                <p className="text-xs text-red-500">
                  {registerForm.formState.errors.username.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs sm:text-sm font-mono">
                email
              </label>
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
              <label className="text-xs sm:text-sm font-mono">
                password
              </label>
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

            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-mono">
                music service
              </label>
              <div className="flex gap-2">
                <label 
                  className={`flex-1 p-3 border cursor-pointer text-center transition-colors ${
                    registerForm.watch("musicService") === "spotify" 
                      ? "border-black bg-[#1DB954] text-white" 
                      : "border-gray-300 hover:border-black"
                  }`}
                  data-testid="radio-spotify"
                >
                  <input
                    {...registerForm.register("musicService")}
                    type="radio"
                    value="spotify"
                    className="sr-only"
                  />
                  <span className="font-mono text-sm sm:text-base">Spotify</span>
                </label>
                <label 
                  className={`flex-1 p-3 border cursor-pointer text-center transition-colors ${
                    registerForm.watch("musicService") === "apple_music" 
                      ? "border-black bg-gradient-to-r from-[#FC3C44] to-[#FA2D55] text-white" 
                      : "border-gray-300 hover:border-black"
                  }`}
                  data-testid="radio-apple-music"
                >
                  <input
                    {...registerForm.register("musicService")}
                    type="radio"
                    value="apple_music"
                    className="sr-only"
                  />
                  <span className="font-mono text-sm sm:text-base">Apple Music</span>
                </label>
              </div>
              {registerForm.formState.errors.musicService && (
                <p className="text-xs text-red-500">
                  {registerForm.formState.errors.musicService.message}
                </p>
              )}
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

        {/* Info blurb */}
        <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-200 text-center">
          <p className="text-xs sm:text-sm text-gray-600 px-2 sm:px-4 font-mono leading-relaxed">
            <span className="font-semibold">eliminate album decision paralysis.</span>
            <br />
            the shelf is designed to help you decide what music to listen to.
            organize your albums, build your listening queue, and track your no-skips collection.
          </p>
          <p className="text-xs text-gray-500 mt-2 sm:mt-3 italic font-mono">
            © 2025 the shelf
          </p>
        </div>
      </div>
    </div>
  );
}