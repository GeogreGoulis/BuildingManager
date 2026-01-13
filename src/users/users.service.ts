import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignRoleDto } from './dto/assign-role.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto, createdBy?: string) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: createUserDto.email,
        password: hashedPassword,
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
        phone: createUserDto.phone,
        isActive: createUserDto.isActive ?? true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId: createdBy,
        action: 'CREATE',
        entity: 'User',
        entityId: user.id,
        newValue: { user: user.email },
      },
    });

    return user;
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        userRoles: {
          include: {
            role: true,
            building: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        userRoles: {
          include: {
            role: true,
            building: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        apartments: {
          include: {
            building: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto, updatedBy?: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const dataToUpdate: any = { ...updateUserDto };

    if (updateUserDto.password) {
      dataToUpdate.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: dataToUpdate,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        isActive: true,
        updatedAt: true,
      },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId: updatedBy,
        action: 'UPDATE',
        entity: 'User',
        entityId: id,
        oldValue: user,
        newValue: updatedUser,
      },
    });

    return updatedUser;
  }

  async remove(id: string, deletedBy?: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.delete({ where: { id } });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId: deletedBy,
        action: 'DELETE',
        entity: 'User',
        entityId: id,
        oldValue: { user: user.email },
      },
    });

    return { message: 'User deleted successfully' };
  }

  async assignRole(userId: string, assignRoleDto: AssignRoleDto, assignedBy?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const role = await this.prisma.role.findUnique({ where: { id: assignRoleDto.roleId } });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Validate building if specified
    if (assignRoleDto.buildingId) {
      const building = await this.prisma.building.findUnique({
        where: { id: assignRoleDto.buildingId },
      });
      if (!building) {
        throw new NotFoundException('Building not found');
      }

      // SUPER_ADMIN cannot be building-scoped
      if (role.name === 'SUPER_ADMIN') {
        throw new BadRequestException('SUPER_ADMIN role cannot be assigned to a specific building');
      }
    } else {
      // Only SUPER_ADMIN can be global
      if (role.name !== 'SUPER_ADMIN') {
        throw new BadRequestException('Only SUPER_ADMIN role can be assigned globally');
      }
    }

    const userRole = await this.prisma.userRole.create({
      data: {
        userId,
        roleId: assignRoleDto.roleId,
        buildingId: assignRoleDto.buildingId,
      },
      include: {
        role: true,
        building: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId: assignedBy,
        action: 'CREATE',
        entity: 'UserRole',
        entityId: userRole.id,
        newValue: {
          userId,
          role: role.name,
          buildingId: assignRoleDto.buildingId,
        },
      },
    });

    return userRole;
  }

  async removeRole(userId: string, roleId: string, buildingId: string | null, removedBy?: string) {
    const userRole = await this.prisma.userRole.findFirst({
      where: {
        userId,
        roleId,
        buildingId,
      },
    });

    if (!userRole) {
      throw new NotFoundException('User role assignment not found');
    }

    await this.prisma.userRole.delete({ where: { id: userRole.id } });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId: removedBy,
        action: 'DELETE',
        entity: 'UserRole',
        entityId: userRole.id,
        oldValue: { userId, roleId, buildingId },
      },
    });

    return { message: 'Role removed successfully' };
  }

  async getUsersByBuilding(buildingId: string) {
    return this.prisma.user.findMany({
      where: {
        OR: [
          {
            userRoles: {
              some: {
                buildingId,
              },
            },
          },
          {
            apartments: {
              some: {
                buildingId,
              },
            },
          },
        ],
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        userRoles: {
          where: {
            OR: [{ buildingId }, { buildingId: null }],
          },
          include: {
            role: true,
          },
        },
        apartments: {
          where: {
            buildingId,
          },
        },
      },
    });
  }
}
