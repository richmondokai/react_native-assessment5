import { axiosInstance } from "./axios_instance";

/**
 * Authentication response type
 * @typedef {Object} AuthResponse
 * @property {string} token - Authentication token
 * @property {Object} user - User data
 */

/**
 * Login user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<AuthResponse>} Authentication response with token and user data
 */
export const login = async (email, password) => {
    try {
        console.log('=== LOGIN API DEBUG ===');
        console.log('Login email:', email);
        console.log('API URL:', axiosInstance.defaults.baseURL + "/api/auth/login");
        
        const response = await axiosInstance.post("/api/auth/login", {
            email,
            password,
        });

        console.log('Login API response:', response.data);
        console.log('User data received:', response.data.user);
        console.log('User bio:', response.data.user?.bio);
        console.log('User profilePicture:', response.data.user?.profilePicture);
        
        return response.data;
    } catch (error) {
        console.log("Login API error: ", error);
        console.log("Error response:", error?.response?.data);
        const msg = error?.response?.data?.error || "Login Failed";
        throw new Error(msg);
    }
};

/**
 * Register new user
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {string} name - User name
 * @param {string} profilePicture - Profile picture URI (optional)
 * @param {Object} additionalProfileData - Additional profile data (bio, etc.)
 * @returns {Promise<AuthResponse>} Authentication response with token and user data
 */
export const register = async (email, password, name, profilePicture = null, additionalProfileData = {}) => {
    try {
        const formData = new FormData();
        formData.append('email', email);
        formData.append('password', password);
        formData.append('name', name);
        
        // Add additional profile data
        if (additionalProfileData.bio) {
            formData.append('bio', additionalProfileData.bio);
        }
        
        // Add any other profile data
        Object.keys(additionalProfileData).forEach(key => {
            if (key !== 'bio' && additionalProfileData[key] !== null && additionalProfileData[key] !== undefined && additionalProfileData[key] !== '') {
                if (typeof additionalProfileData[key] === 'object') {
                    formData.append(key, JSON.stringify(additionalProfileData[key]));
                } else {
                    formData.append(key, additionalProfileData[key]);
                }
            }
        });
        
        if (profilePicture) {
            const uriParts = profilePicture.split('.');
            const fileType = uriParts[uriParts.length - 1];
            
            formData.append('profilePicture', {
                uri: profilePicture,
                name: `profile.${fileType}`,
                type: `image/${fileType}`,
            });
        }

        console.log('=== REGISTRATION API DEBUG ===');
        console.log('FormData contents:');
        console.log('- email:', email);
        console.log('- password:', password ? '[HIDDEN]' : 'MISSING');
        console.log('- name:', name);
        console.log('- profilePicture:', profilePicture ? 'PRESENT' : 'NONE');
        console.log('- additionalProfileData:', additionalProfileData);
        console.log('API URL:', axiosInstance.defaults.baseURL + "/api/auth/register");

        const response = await axiosInstance.post("/api/auth/register", formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        console.log('Registration successful:', response.data);
        return response.data;
    } catch (error) {
        console.log("Registration API Error:", error);
        console.log("Error response:", error?.response?.data);
        console.log("Error status:", error?.response?.status);
        console.log("Error message:", error?.message);
        
        const msg = error?.response?.data?.error || error?.message || "Register Failed";
        throw new Error(msg);
    }
};

/**
 * Update user profile
 * @param {Object} profileData - Profile data to update
 * @returns {Promise<Object>} Updated user data
 */
export const updateProfile = async (profileData) => {
    try {
        const formData = new FormData();
        
        // Add text fields
        Object.keys(profileData).forEach(key => {
            if (key !== 'profilePicture' && profileData[key] !== null && profileData[key] !== undefined) {
                if (typeof profileData[key] === 'object') {
                    formData.append(key, JSON.stringify(profileData[key]));
                } else {
                    formData.append(key, profileData[key]);
                }
            }
        });
        
        // Add profile picture if provided
        if (profileData.profilePicture && typeof profileData.profilePicture === 'string') {
            const uriParts = profileData.profilePicture.split('.');
            const fileType = uriParts[uriParts.length - 1];
            
            formData.append('profilePicture', {
                uri: profileData.profilePicture,
                name: `profile.${fileType}`,
                type: `image/${fileType}`,
            });
        }

        const response = await axiosInstance.post("/api/auth/register", formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    } catch (error) {
        console.log("got error: ", error);
        const msg = error?.response?.data?.error || "Profile Update Failed";
        throw new Error(msg);
    }
};

/**
 * Request password reset
 * @param {string} email - User email
 * @returns {Promise<Object>} Response data
 */
export const forgotPassword = async (email) => {
    try {
        const response = await axiosInstance.post("/api/auth/forgot-password", {
            email,
        });
        return response.data;
    } catch (error) {
        console.log("got error: ", error);
        const msg = error?.response?.data?.error || "Forgot Password Failed";
        throw new Error(msg);
    }
};

/**
 * Reset password with token
 * @param {string} token - Reset token
 * @param {string} newPassword - New password
 * @returns {Promise<Object>} Response data
 */
export const resetPassword = async (token, newPassword) => {
    try {
        const response = await axiosInstance.post("/api/auth/reset-password", {
            token,
            newPassword,
        });
        return response.data;
    } catch (error) {
        console.log("got error: ", error);
        const msg = error?.response?.data?.error || "Reset Password Failed";
        throw new Error(msg);
    }
};
