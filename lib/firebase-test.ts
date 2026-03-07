import { database, ref, onValue, off } from "./firebase";

/**
 * Test Firebase connection and configuration
 * Run this function to verify Firebase is properly configured
 */
export async function testFirebaseConnection(): Promise<{
  success: boolean;
  error?: string;
  details?: any;
}> {
  try {
    // Test 1: Check if Firebase config is available
    const requiredEnvVars = [
      'NEXT_PUBLIC_FIREBASE_API_KEY',
      'NEXT_PUBLIC_FIREBASE_DATABASE_URL',
      'NEXT_PUBLIC_FIREBASE_PROJECT_ID'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      return {
        success: false,
        error: `Missing environment variables: ${missingVars.join(', ')}`
      };
    }

    // Test 2: Try to connect to Firebase
    return new Promise((resolve) => {
      const testRef = ref(database, ".info/connected");
      
      const timeout = setTimeout(() => {
        off(testRef, "value", listener);
        resolve({
          success: false,
          error: "Connection timeout - check Firebase configuration and network"
        });
      }, 10000); // 10 second timeout

      const listener = onValue(
        testRef,
        (snapshot) => {
          clearTimeout(timeout);
          off(testRef, "value", listener);
          
          const isConnected = snapshot.val();
          
          if (isConnected) {
            // Test 3: Try to read from Udara path
            const udaraRef = ref(database, "Udara");
            const udaraListener = onValue(
              udaraRef,
              (udaraSnapshot) => {
                off(udaraRef, "value", udaraListener);
                const data = udaraSnapshot.val();
                
                resolve({
                  success: true,
                  details: {
                    connected: true,
                    udaraPath: "accessible",
                    hasData: !!data,
                    dataStructure: data ? Object.keys(data) : null
                  }
                });
              },
              (error) => {
                off(udaraRef, "value", udaraListener);
                resolve({
                  success: false,
                  error: `Failed to access /Udara path: ${error.message}`
                });
              }
            );
          } else {
            resolve({
              success: false,
              error: "Firebase not connected - check database URL and network"
            });
          }
        },
        (error) => {
          clearTimeout(timeout);
          off(testRef, "value", listener);
          resolve({
            success: false,
            error: `Firebase connection error: ${error.message}`
          });
        }
      );
    });
  } catch (error: any) {
    return {
      success: false,
      error: `Firebase initialization error: ${error.message}`
    };
  }
}

/**
 * Check Firebase environment variables
 */
export function checkFirebaseEnvironment(): {
  success: boolean;
  missing: string[];
  configured: string[];
} {
  const requiredVars = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_DATABASE_URL',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID',
    'NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID'
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);
  const configured = requiredVars.filter(varName => process.env[varName]);

  return {
    success: missing.length === 0,
    missing,
    configured
  };
}
