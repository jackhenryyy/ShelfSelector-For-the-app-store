import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { passwordResetRequestSchema } from "@shared/schema";
import { z } from "zod";
import { useForgotPassword } from "@/hooks/use-forgot-password";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type ForgotPasswordFormData = z.infer<typeof passwordResetRequestSchema>;

interface ForgotPasswordDialogProps {
  trigger?: React.ReactNode;
}

export function ForgotPasswordDialog({ trigger }: ForgotPasswordDialogProps) {
  const [open, setOpen] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const { requestResetMutation } = useForgotPassword();

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(passwordResetRequestSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = (data: ForgotPasswordFormData) => {
    requestResetMutation.mutate(data, {
      onSuccess: (response) => {
        // In demo mode, we get the token back
        if (response.resetToken) {
          setResetToken(response.resetToken);
        }
        form.reset();
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="link" size="sm" className="font-mono text-xs p-0">
            forgot password?
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-mono">Reset Password</DialogTitle>
        </DialogHeader>
        
        {resetToken ? (
          <div className="space-y-4">
            <p className="text-sm font-mono text-green-600">
              Reset token generated (demo mode only):
            </p>
            <div className="p-3 bg-gray-100 rounded border font-mono text-xs break-all">
              {resetToken}
            </div>
            <p className="text-xs font-mono text-gray-600">
              Copy this token and use it in the reset password form. In a real app, this would be sent via email.
            </p>
            <Button
              onClick={() => {
                setOpen(false);
                setResetToken(null);
              }}
              className="w-full font-mono"
            >
              Close
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono">Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} className="font-mono" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  className="font-mono"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={requestResetMutation.isPending}
                  className="font-mono"
                >
                  {requestResetMutation.isPending ? "Sending..." : "Send Reset Link"}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}