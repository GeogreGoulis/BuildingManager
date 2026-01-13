export interface JwtPayload {
  sub: string;
  email: string;
  roles: {
    role: string;
    buildingId: string | null;
  }[];
}

export interface RequestUser extends JwtPayload {
  userId: string;
}
