import { NavigationMenuItem, NavigationMenuLink } from '@/components/ui/navigation-menu';
import { navigationMenuTriggerStyle } from '@/components/ui/navigation-menu';
import Link from 'next/link';
import { useAuth } from './AuthProvider';

export function LoginButton() {
  const { user, logout } = useAuth();

  return (
    <>
      {!user ? (
        <NavigationMenuItem>
          <Link href="/login" passHref legacyBehavior>
            <NavigationMenuLink className={navigationMenuTriggerStyle()}>
              Login
            </NavigationMenuLink>
          </Link>
        </NavigationMenuItem>
      ) : (
        <NavigationMenuItem>
          <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
            <button onClick={logout} className="w-full text-left">
              Logout
            </button>
          </NavigationMenuLink>
        </NavigationMenuItem>
      )}
    </>
  );
}
