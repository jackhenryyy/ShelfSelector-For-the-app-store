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
  const [resetSent, setResetSent] = useState(false);
  const { requestResetMutation } = useForgotPassword();

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(passwordResetRequestSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = (data: ForgotPasswordFormData) => {
    requestResetMutation.mutate(data, {
      onSuccess: () => {
        setResetSent(true);
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
        
        {resetSent ? (
          <div className="space-y-4">
            <p className="text-sm font-mono text-green-600">
              Reset request sent successfully!
            </p>
            <p className="text-xs font-mono text-gray-600">
              Check the server logs for your reset token and URL, then visit the reset password page.
            </p>
            <Button
              onClick={() => {
                setOpen(false);
                setResetSent(false);
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