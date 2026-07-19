
export interface LoginRequestDto {
  username: string;
  password: string;
}

export interface LoginResponseDto {
  access: string;
  refresh: string;
  user_id: number;
  username: string;
  email: string;
  is_staff: boolean;
}

export interface RegisterRequestDto {
  username: string;
  email: string;
  password: string;
  password2: string;
}

export interface LogoutRequestDto {
  refresh: string;
}
