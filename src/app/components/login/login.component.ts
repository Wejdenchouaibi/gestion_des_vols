import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  registerForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  selectedRole: 'admin' | 'client' | null = null;
  isLoginMode = true;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });

    this.registerForm = this.fb.group(
      {
        firstName: ['', [Validators.required, Validators.minLength(2)]],
        lastName: ['', [Validators.required, Validators.minLength(2)]],
        username: ['', [Validators.required, Validators.minLength(3)]],
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]],
      },
      { validators: this.passwordMatchValidator }
    );
  }

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.redirectBasedOnRole();
    } else {
      const token = this.authService.getToken();
      if (token) {
        this.authService.validateToken().subscribe({
          next: (response) => {
            if (response.success && response.user) {
              this.redirectBasedOnRole();
            } else {
              this.authService.logout();
            }
          },
          error: () => {
            this.authService.logout();
          }
        });
      }
    }
  }

  selectRole(role: 'admin' | 'client'): void {
    this.selectedRole = role;
    this.errorMessage = '';
    this.successMessage = '';
    this.loginForm.reset();
    this.registerForm.reset();
  }

  changeRole(): void {
    this.selectedRole = null;
    this.errorMessage = '';
    this.successMessage = '';
    this.loginForm.reset();
    this.registerForm.reset();
  }

  toggleMode(): void {
    this.isLoginMode = !this.isLoginMode;
    this.errorMessage = '';
    this.successMessage = '';
    this.loginForm.reset();
    this.registerForm.reset();
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');

    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    return null;
  }

  onSubmit(): void {
    if (this.isLoginMode || this.selectedRole === 'admin') {
      this.handleLogin();
    } else {
      this.handleRegister();
    }
  }

  handleLogin(): void {
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';

      const { username, password } = this.loginForm.value;

      this.authService.login(username, password).subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.success && response.user) {
            this.redirectBasedOnRole();
          } else {
            this.errorMessage = response.message;
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = 'Une erreur est survenue. Veuillez réessayer.';
          console.error('Login error:', error);
        },
      });
    } else {
      this.markFormGroupTouched(this.loginForm);
    }
  }

  handleRegister(): void {
    if (this.registerForm.valid && this.selectedRole === 'client') {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';

      const formData = this.registerForm.value;
      const userData: {
        firstName: string;
        lastName: string;
        username: string;
        email: string;
        password: string;
        role: 'client';
      } = {
        firstName: String(formData.firstName),
        lastName: String(formData.lastName),
        username: String(formData.username),
        email: String(formData.email),
        password: String(formData.password),
        role: 'client',
      };

      this.authService.register(userData).subscribe({
        next: (response) => {
          this.isLoading = false;
          if (response.success && response.user) {
            this.successMessage = response.message;
            setTimeout(() => {
              this.redirectBasedOnRole();
            }, 2000);
          } else {
            this.errorMessage = response.message;
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = 'Une erreur est survenue. Veuillez réessayer.';
          console.error('Register error:', error);
        },
      });
    } else {
      this.markFormGroupTouched(this.registerForm);
    }
  }

  private redirectBasedOnRole(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      if (user.role === 'admin') {
        this.router.navigate(['/admin/dashboard']);
      } else {
        this.router.navigate(['/client/dashboard']);
      }
    }
  }

  private markFormGroupTouched(form: FormGroup): void {
    Object.keys(form.controls).forEach((key) => {
      const control = form.get(key);
      control?.markAsTouched();
    });
  }

  getFieldError(fieldName: string, form: FormGroup = this.loginForm): string {
    const field = form.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return `${fieldName} est requis`;
      }
      if (field.errors['minlength']) {
        const requiredLength = field.errors['minlength'].requiredLength;
        return `${fieldName} doit contenir au moins ${requiredLength} caractères`;
      }
      if (field.errors['email']) {
        return "Format d'email invalide";
      }
      if (field.errors['passwordMismatch']) {
        return 'Les mots de passe ne correspondent pas';
      }
    }
    return '';
  }

  getRegisterFieldError(fieldName: string): string {
    return this.getFieldError(fieldName, this.registerForm);
  }
}