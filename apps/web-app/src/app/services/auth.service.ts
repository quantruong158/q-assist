import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  Auth,
  User,
  user as userObservable,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithCredential,
  GoogleAuthProvider,
  OAuthProvider,
  signOut,
  updateProfile,
  browserLocalPersistence,
} from '@angular/fire/auth';
import { Firestore, doc, setDoc, getDoc, serverTimestamp } from '@angular/fire/firestore';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { UserProfile } from '../models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth = inject(Auth);
  private readonly firestore = inject(Firestore);
  private readonly platformId = inject(PLATFORM_ID);

  public user$ = userObservable(this.auth);

  private readonly userSignal = signal<User | null>(null);
  readonly currentUser = this.userSignal.asReadonly();
  readonly isLoading = signal(true);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.user$.subscribe((user) => {
        this.userSignal.set(user);
      });
    }

    this.auth.setPersistence(browserLocalPersistence).then(() => {
      this.isLoading.set(false);
    });
    this.user$ = userObservable(this.auth);
  }

  async signInWithEmail(email: string, password: string): Promise<void> {
    const credential = await signInWithEmailAndPassword(this.auth, email, password);
    await this.ensureUserProfile(credential.user);
  }

  async signUpWithEmail(email: string, password: string, displayName: string): Promise<void> {
    const credential = await createUserWithEmailAndPassword(this.auth, email, password);

    await updateProfile(credential.user, { displayName });
    await this.createUserProfile(credential.user, displayName);
  }

  async signInWithGoogle(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      // Native Google Sign-In
      const result = await FirebaseAuthentication.signInWithGoogle();
      if (result.credential?.idToken) {
        const credential = GoogleAuthProvider.credential(result.credential.idToken);
        const userCredential = await signInWithCredential(this.auth, credential);
        await this.ensureUserProfile(userCredential.user);
      }
    } else {
      // Web Google Sign-In
      const provider = new GoogleAuthProvider();
      const credential = await signInWithPopup(this.auth, provider);
      await this.ensureUserProfile(credential.user);
    }
  }

  async signInWithApple(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      // Native Apple Sign-In
      const result = await FirebaseAuthentication.signInWithApple();
      if (result.credential?.idToken) {
        const provider = new OAuthProvider('apple.com');
        const credential = provider.credential({
          idToken: result.credential.idToken,
          rawNonce: result.credential.nonce,
        });
        const userCredential = await signInWithCredential(this.auth, credential);
        await this.ensureUserProfile(userCredential.user);
      }
    }
    // Apple Sign-In on web would require additional setup
  }

  public async signout(): Promise<void> {
    await signOut(this.auth);
    sessionStorage.clear();
  }

  private async ensureUserProfile(user: User): Promise<void> {
    const userRef = doc(this.firestore, `users/${user.uid}`);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      await this.createUserProfile(user, user.displayName || 'User');
    }
  }

  private async createUserProfile(user: User, displayName: string): Promise<void> {
    const userRef = doc(this.firestore, `users/${user.uid}`);
    const profile: Omit<UserProfile, 'createdAt' | 'updatedAt'> & {
      createdAt: ReturnType<typeof serverTimestamp>;
      updatedAt: ReturnType<typeof serverTimestamp>;
    } = {
      uid: user.uid,
      email: user.email || '',
      displayName,
      photoURL: user.photoURL,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(userRef, profile);
  }
}
