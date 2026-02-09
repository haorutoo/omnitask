
import { User } from "../types";

const AUTH_KEY = 'omnitask_user';

export const loginWithGoogle = async (): Promise<User> => {
  // Simulate network delay for OAuth flow
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  const mockUser: User = {
    id: 'google-user-123',
    name: 'Alex Architect',
    email: 'alex.architect@gmail.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex'
  };
  
  localStorage.setItem(AUTH_KEY, JSON.stringify(mockUser));
  return mockUser;
};

export const logout = () => {
  localStorage.removeItem(AUTH_KEY);
};

export const getCurrentUser = (): User | null => {
  const data = localStorage.getItem(AUTH_KEY);
  return data ? JSON.parse(data) : null;
};

// Simulation of "Adding other users via Google Auth"
// In a real app, this would search your Firebase/OAuth directory
export const searchGoogleUsers = async (email: string): Promise<User[]> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  const mockDirectory = [
    { id: 'u1', name: 'Jordan Doe', email: 'jordan@gmail.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jordan' },
    { id: 'u2', name: 'Sarah Smith', email: 'sarah@gmail.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah' },
    { id: 'u3', name: 'Mike Ross', email: 'mike@gmail.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike' },
  ];
  
  return mockDirectory.filter(u => u.email.includes(email.toLowerCase()));
};
