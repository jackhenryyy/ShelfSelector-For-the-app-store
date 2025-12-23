
import { db } from './db';
import { users } from '@shared/schema';

/**
 * WARNING: This deletes ALL users and their associated data
 * Use with extreme caution - this cannot be undone
 */
export async function clearAllUsers() {
  try {
    const result = await db.delete(users);
    console.log('All users deleted successfully');
    return result;
  } catch (error) {
    console.error('Error deleting users:', error);
    throw error;
  }
}

// If this file is run directly, execute the clear operation
if (require.main === module) {
  clearAllUsers()
    .then(() => {
      console.log('Database cleared of all users');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Failed to clear users:', err);
      process.exit(1);
    });
}
