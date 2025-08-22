import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useDarkMode } from '../../hooks/useDarkMode';

const SignupScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [emailError, setEmailError] = useState('');
  const [isEmailValid, setIsEmailValid] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [isPasswordMatch, setIsPasswordMatch] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { isDarkMode, styles: darkModeStyles } = useDarkMode();
  const { register } = useAuth();

  // Email validation function (same as LoginScreen)
  const validateEmail = (emailValue) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    if (!emailValue) {
      setEmailError('');
      setIsEmailValid(false);
      return false;
    }
    
    if (!emailValue.includes('@')) {
      setEmailError('Email must contain "@" symbol');
      setIsEmailValid(false);
      return false;
    }
    
    if (!emailValue.includes('.')) {
      setEmailError('Email must contain domain extension (e.g., .com)');
      setIsEmailValid(false);
      return false;
    }
    
    if (!emailRegex.test(emailValue)) {
      setEmailError('Please enter a valid email format (e.g., user@example.com)');
      setIsEmailValid(false);
      return false;
    }
    
    const domainPart = emailValue.split('@')[1];
    if (!domainPart || !domainPart.includes('.')) {
      setEmailError('Email must have proper domain (e.g., @gmail.com)');
      setIsEmailValid(false);
      return false;
    }
    
    setEmailError('');
    setIsEmailValid(true);
    return true;
  };

  const handleEmailChange = (value) => {
    setEmail(value);
    if (value.length > 0) {
      validateEmail(value);
    } else {
      setEmailError('');
      setIsEmailValid(false);
    }
  };

  // Password validation function
  const validatePassword = (passwordValue) => {
    if (!passwordValue) {
      setPasswordError('');
      return false;
    }
    
    if (passwordValue.length < 8) {
      setPasswordError('Password must be at least 8 characters long');
      return false;
    }
    
    setPasswordError('');
    return true;
  };

  // Password matching validation
  const validatePasswordMatch = (confirmValue, originalPassword) => {
    if (!confirmValue) {
      setConfirmPasswordError('');
      setIsPasswordMatch(false);
      return false;
    }
    
    if (confirmValue !== originalPassword) {
      setConfirmPasswordError('Passwords do not match');
      setIsPasswordMatch(false);
      return false;
    }
    
    setConfirmPasswordError('');
    setIsPasswordMatch(true);
    return true;
  };

  // Handle password input change
  const handlePasswordChange = (value) => {
    setPassword(value);
    if (value.length > 0) {
      validatePassword(value);
    } else {
      setPasswordError('');
    }
    
    // Re-validate confirm password if it has been entered
    if (confirmPassword.length > 0) {
      validatePasswordMatch(confirmPassword, value);
    }
  };

  // Handle confirm password input change
  const handleConfirmPasswordChange = (value) => {
    setConfirmPassword(value);
    if (value.length > 0) {
      validatePasswordMatch(value, password);
    } else {
      setConfirmPasswordError('');
      setIsPasswordMatch(false);
    }
  };

  const handleSignup = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    // Validate email format before attempting signup
    if (!validateEmail(email)) {
      Alert.alert('Invalid Email', emailError || 'Please enter a valid email address');
      return;
    }

    // Validate password before attempting signup
    if (!validatePassword(password)) {
      Alert.alert('Invalid Password', passwordError || 'Password must be at least 8 characters long');
      return;
    }

    // Validate password match before attempting signup
    if (!validatePasswordMatch(confirmPassword, password)) {
      Alert.alert('Password Mismatch', confirmPasswordError || 'Passwords do not match');
      return;
    }

    // Navigate to ProfileSetupScreen with signup data
    // Account creation will happen after profile setup completion
    navigation.navigate('ProfileSetup', {
      signupData: {
        name,
        email,
        password
      }
    });
  };

  return (
    <ScrollView style={[styles.container, darkModeStyles.container]}>
      <Text style={[styles.title, isDarkMode && { color: darkModeStyles.text.color }]}>Create Account</Text>
      <Text style={[styles.subtitle, isDarkMode && { color: darkModeStyles.subText.color }]}>Sign up to get started</Text>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Text style={[styles.label, isDarkMode && { color: darkModeStyles.text.color }]}>
            Full Name <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={[styles.input, isDarkMode && darkModeStyles.input]}
            placeholder="Enter your full name"
            placeholderTextColor={isDarkMode ? '#888' : '#999'}
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, isDarkMode && { color: darkModeStyles.text.color }]}>
            Email <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={[
                styles.input, 
                styles.emailInput,
                isDarkMode && darkModeStyles.input,
                emailError && styles.inputError,
                isEmailValid && styles.inputValid
              ]}
              placeholder="Enter your email"
              placeholderTextColor={isDarkMode ? '#888' : '#999'}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={handleEmailChange}
            />
            {email.length > 0 && (
              <View style={styles.validationIcon}>
                {isEmailValid ? (
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                ) : emailError ? (
                  <Ionicons name="close-circle" size={20} color="#F44336" />
                ) : null}
              </View>
            )}
          </View>
          {emailError ? (
            <Text style={styles.errorText}>{emailError}</Text>
          ) : null}
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, isDarkMode && { color: darkModeStyles.text.color }]}>
            Password <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.passwordInputContainer}>
            <TextInput
              style={[
                styles.input, 
                styles.passwordInput,
                isDarkMode && darkModeStyles.input,
                passwordError && styles.inputError,
                password.length >= 8 && !passwordError && styles.inputValid
              ]}
              placeholder="Create password"
              placeholderTextColor={isDarkMode ? '#888' : '#999'}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={handlePasswordChange}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons
                name={showPassword ? 'eye' : 'eye-off'}
                size={20}
                color={isDarkMode ? '#888' : '#666'}
              />
            </TouchableOpacity>
            {passwordError && (
              <View style={styles.passwordValidationIcon}>
                <Ionicons name="close-circle" size={20} color="#F44336" />
              </View>
            )}
          </View>
          {passwordError ? (
            <Text style={styles.errorText}>{passwordError}</Text>
          ) : null}
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, isDarkMode && { color: darkModeStyles.text.color }]}>
            Confirm Password <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.passwordInputContainer}>
            <TextInput
              style={[
                styles.input, 
                styles.passwordInput,
                isDarkMode && darkModeStyles.input,
                confirmPasswordError && styles.inputError,
                isPasswordMatch && styles.inputValid
              ]}
              placeholder="Confirm your password"
              placeholderTextColor={isDarkMode ? '#888' : '#999'}
              secureTextEntry={!showConfirmPassword}
              value={confirmPassword}
              onChangeText={handleConfirmPasswordChange}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <Ionicons
                name={showConfirmPassword ? 'eye' : 'eye-off'}
                size={20}
                color={isDarkMode ? '#888' : '#666'}
              />
            </TouchableOpacity>
            {confirmPasswordError && (
              <View style={styles.passwordValidationIcon}>
                <Ionicons name="close-circle" size={20} color="#F44336" />
              </View>
            )}
          </View>
          {confirmPasswordError ? (
            <Text style={styles.errorText}>{confirmPasswordError}</Text>
          ) : null}
        </View>

        <TouchableOpacity 
          style={[
            styles.button, 
            isDarkMode && darkModeStyles.button
          ]}
          onPress={handleSignup}
        >
          <Text style={styles.buttonText}>
            Finish Sign Up
          </Text>
        </TouchableOpacity>

        <View style={styles.loginContainer}>
          <Text style={[styles.loginText, isDarkMode && { color: darkModeStyles.subText.color }]}>Already have an account?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={[styles.loginLink, isDarkMode && { color: '#4a9eff' }]}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 80,
    marginBottom: 10,
    color: '#333',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
  },
  required: {
    color: '#F44336',
    fontWeight: 'bold',
  },
  inputWrapper: {
    position: 'relative',
  },
  emailInput: {
    paddingLeft: 16,
    paddingRight: 45,
  },
  passwordInputContainer: {
    position: 'relative',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16, // Default balanced padding
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  passwordInput: {
    paddingRight: 80, // Make room for both eye icon and validation icon
  },
  inputError: {
    borderColor: '#F44336',
    backgroundColor: '#ffeaea',
  },
  inputValid: {
    borderColor: '#4CAF50',
    backgroundColor: '#f0f8f0',
  },
  validationIcon: {
    position: 'absolute',
    right: 12, // Positioned at the right edge for email field
    top: 12,
  },
  passwordValidationIcon: {
    position: 'absolute',
    right: 45, // Move left to make room for eye icon in password fields
    top: 12,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 12,
    padding: 5,
  },
  errorText: {
    color: '#F44336',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginVertical: 20,
  },
  buttonDisabled: {
    backgroundColor: '#a0c8ff',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
  },
  loginText: {
    color: '#666',
    fontSize: 14,
  },
  loginLink: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },
});

export default SignupScreen;