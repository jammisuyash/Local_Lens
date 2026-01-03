'use client';

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Logo } from "@/components/icons";
import { useEffect, useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useAuth, useUser } from "@/firebase";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { Loader } from "lucide-react";

export default function LoginPage() {
  const [isClient, setIsClient] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmationResult, setConfirmationResult] =
    useState<ConfirmationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);
  
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  const recaptchaContainerRef = useRef<HTMLDivElement>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    setIsClient(true);
    if (!isUserLoading && user) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  const handleEmailSignIn = async () => {
    if (!auth) return;
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Auth state change will trigger redirect in useUser effect
    } catch (error: any) {
      toast({
          variant: 'destructive',
          title: 'Sign In Failed',
          description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignUp = async () => {
    if (!auth) return;
    setIsLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
       router.push('/welcome');
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Sign Up Failed',
            description: error.message,
        });
    } finally {
        setIsLoading(false);
    }
  };

  const handlePhoneSignIn = async () => {
    if (!auth || !recaptchaContainerRef.current) return;
    setIsLoading(true);
    try {
      if (!recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
          size: "invisible",
        });
      }
      
      const recaptchaVerifier = recaptchaVerifierRef.current;
      const result = await signInWithPhoneNumber(auth, phone, recaptchaVerifier);
      setConfirmationResult(result);
      setIsOtpSent(true);
      toast({
        title: "Verification Code Sent",
        description: "Check your phone for the OTP.",
      });
    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Failed to send code",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async () => {
    if (!confirmationResult) return;
    setIsLoading(true);
    try {
      await confirmationResult.confirm(otp);
      router.push('/welcome');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Invalid OTP",
        description: "The code you entered is incorrect. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  if (!isClient || isUserLoading) {
    return (
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
            <Loader className="h-12 w-12 animate-spin text-primary" />
        </div>
    )
  }


  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <div id="recaptcha-container" ref={recaptchaContainerRef}></div>
      <Tabs defaultValue="email" className="w-full max-w-sm">
        <div className="flex justify-center mb-4">
            <div className="flex items-center gap-2 text-2xl font-semibold font-headline">
                <Logo className="h-8 w-8 text-primary" />
                LocalLens
            </div>
        </div>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="email" disabled={isLoading}>Email</TabsTrigger>
          <TabsTrigger value="phone" disabled={isLoading}>Phone</TabsTrigger>
        </TabsList>
        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle>Continue with Email</CardTitle>
              <CardDescription>
                Enter your email and password to sign in or create an account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="m@example.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading} />
              </div>
            </CardContent>
            <CardFooter className="flex-col gap-4">
              <div className="grid grid-cols-2 gap-4 w-full">
                <Button onClick={handleEmailSignIn} className="w-full" disabled={isLoading}>
                    {isLoading && <Loader className="animate-spin mr-2" />} Sign In
                </Button>
                <Button variant="secondary" onClick={handleEmailSignUp} className="w-full" disabled={isLoading}>
                    {isLoading && <Loader className="animate-spin mr-2" />} Sign Up
                </Button>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="phone">
          <Card>
            <CardHeader>
              <CardTitle>{isOtpSent ? 'Enter Code' : 'Sign in with Phone'}</CardTitle>
              <CardDescription>
                {isOtpSent ? 'We sent a verification code to your phone.' : 'Enter your phone number to receive a verification code.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isOtpSent ? (
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" type="tel" placeholder="+1 (555) 000-0000" value={phone} onChange={e => setPhone(e.target.value)} disabled={isLoading}/>
                  </div>
              ) : (
                <div className="space-y-2">
                    <Label htmlFor="otp">Verification Code</Label>
                    <Input id="otp" type="text" placeholder="123456" value={otp} onChange={e => setOtp(e.target.value)} disabled={isLoading} />
                </div>
              )}
            </CardContent>
            <CardFooter className="flex-col">
              {!isOtpSent ? (
                  <Button className="w-full" onClick={handlePhoneSignIn} disabled={isLoading}>
                    {isLoading && <Loader className="animate-spin mr-2" />} Send Code
                  </Button>
              ) : (
                <Button className="w-full" onClick={handleOtpSubmit} disabled={isLoading}>
                    {isLoading && <Loader className="animate-spin mr-2" />} Verify & Sign In
                </Button>
              )}
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
