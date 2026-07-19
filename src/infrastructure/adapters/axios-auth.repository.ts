import type {
  AuthRepository,
  AuthSession,
  LoginCredentials,
  RegisterData,
} from '../../domain/ports/AuthRepository';
import type { User } from '../../domain/entities/User';
import type {
  LoginRequestDto,
  LoginResponseDto,
  LogoutRequestDto,
  RegisterRequestDto,
} from '../../application/dtos/auth.dto';
import { AuthException } from '../../domain/exceptions/ApiException';
import { axiosClient } from '../http/axios-client';
import { parseApiError } from '../http/api-error';
import { localTokenStorage } from '../storage/local-token-storage';

function toAuthError(error: unknown, fallback: string): AuthException {
  const parsed = parseApiError(error, fallback);
  return new AuthException(parsed.message, parsed.statusCode);
}

export class AxiosAuthRepository implements AuthRepository {
  async login(credentials: LoginCredentials): Promise<AuthSession> {
    try {
      const body: LoginRequestDto = credentials;
      const { data } = await axiosClient.post<LoginResponseDto>('/auth/login/', body);
      const user: User = {
        id: data.user_id,
        username: data.username,
        email: data.email,
        isStaff: data.is_staff,
      };
      localTokenStorage.setToken(data.access);
      localTokenStorage.setRefreshToken(data.refresh);
      localTokenStorage.setUser(user);
      return { user, token: data.access };
    } catch (error) {
      throw toAuthError(error, 'Credenciales incorrectas');
    }
  }

  async register(data: RegisterData): Promise<AuthSession> {
    try {
      const body: RegisterRequestDto = {
        username: data.username,
        email: data.email,
        password: data.password,
        password2: data.password,
      };
      await axiosClient.post('/auth/registro/', body);
    } catch (error) {
      throw toAuthError(error, 'No se pudo completar el registro');
    }
    return this.login({ username: data.username, password: data.password });
  }

  async logout(): Promise<void> {
    const refresh = localTokenStorage.getRefreshToken();
    try {
      if (refresh) {
        const body: LogoutRequestDto = { refresh };
        await axiosClient.post('/auth/logout/', body);
      }
    } catch {
    } finally {
      localTokenStorage.clear();
    }
  }
}
