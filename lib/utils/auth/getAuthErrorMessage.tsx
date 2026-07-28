import { AlertTriangle, Clock, Lock, Mail, Shield, Settings } from 'lucide-react'

const getAuthErrorMessage = (error: string, email: string) => {
  switch (error) {
    case 'AccessDenied':
      return {
        icon: Shield,
        title: 'Access Denied',
        message:
          'Your email is not registered with this chapter. Only approved members can sign in. If you believe this is a mistake, please contact your chapter administrator.'
      }

    // on the error page, read the email from the URL if you stored it
    case 'Verification':
      const isLikelyCorporate =
        email?.endsWith('.org') || ['outlook', 'hotmail', 'live'].some((d) => email?.includes(d))

      return {
        icon: Clock,
        title: 'Link Expired',
        message: isLikelyCorporate
          ? 'Your email provider may have automatically clicked the link before you did — this is common with Microsoft Outlook and organization email accounts. Try signing in with a Gmail address instead, or ask your administrator to add your Gmail as a secondary email.'
          : 'This sign-in link has expired or has already been used. Please request a new one.'
      }

    case 'EmailSignin':
      return {
        icon: Mail,
        title: 'Email Could Not Be Sent',
        message: 'We had trouble sending your sign-in email. Please check your email address and try again.'
      }

    case 'OAuthSignin':
    case 'OAuthCallback':
      return {
        icon: AlertTriangle,
        title: 'Sign-In Error',
        message: 'There was a problem connecting to the sign-in provider. Please try again.'
      }

    case 'SessionRequired':
      return {
        icon: Lock,
        title: 'Sign In Required',
        message: 'You need to be signed in to access this page.'
      }

    case 'Configuration':
      return {
        icon: Settings,
        title: 'Configuration Error',
        message: 'There is a problem with the authentication setup. Please contact your administrator.'
      }

    default:
      return {
        icon: AlertTriangle,
        title: 'Something Went Wrong',
        message: 'An unexpected error occurred. Please try again.'
      }
  }
}

export default getAuthErrorMessage
