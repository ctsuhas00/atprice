import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { pool } from '../db/pool';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  role: 'CUSTOMER' | 'SELLER' | 'ADMIN';
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface User extends AuthUser {}
  }
}

export function configurePassport() {
  passport.use(new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:8787/api/v1/auth/google/callback',
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const googleId = profile.id;
        const email = profile.emails?.[0]?.value ?? '';
        const name = profile.displayName ?? '';
        const avatarUrl = profile.photos?.[0]?.value ?? null;

        if (!email) return done(new Error('No email from Google profile'));

        const client = await pool.connect();
        try {
          // Check existing user by google_id
          let { rows } = await client.query(
            'SELECT id, email, name, avatar_url, role FROM users WHERE google_id=$1',
            [googleId]
          );

          if (rows.length === 0) {
            // Check by email (in case they registered another way)
            const byEmail = await client.query(
              'SELECT id, email, name, avatar_url, role FROM users WHERE email=$1',
              [email]
            );
            if (byEmail.rows.length > 0) {
              // Link google_id to existing account
              await client.query(
                'UPDATE users SET google_id=$1, avatar_url=COALESCE($2, avatar_url), last_login_at=now() WHERE id=$3',
                [googleId, avatarUrl, byEmail.rows[0].id]
              );
              rows = byEmail.rows;
            } else {
              // Create new user
              const newUser = await client.query(
                `INSERT INTO users(google_id, email, name, avatar_url, role, last_login_at)
                 VALUES($1,$2,$3,$4,'CUSTOMER',now()) RETURNING id, email, name, avatar_url, role`,
                [googleId, email, name, avatarUrl]
              );
              rows = newUser.rows;
            }
          } else {
            await client.query(
              'UPDATE users SET last_login_at=now(), avatar_url=COALESCE($1, avatar_url) WHERE id=$2',
              [avatarUrl, rows[0].id]
            );
          }

          return done(null, rows[0] as AuthUser);
        } finally {
          client.release();
        }
      } catch (err) {
        return done(err as Error);
      }
    }
  ));

  passport.serializeUser((user, done) => {
    done(null, (user as AuthUser).id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const client = await pool.connect();
      const { rows } = await client.query(
        'SELECT id, email, name, avatar_url, role FROM users WHERE id=$1',
        [id]
      );
      client.release();
      done(null, rows[0] ?? null);
    } catch (err) {
      done(err);
    }
  });
}
