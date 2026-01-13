import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateBuildingDto } from './dto/create-building.dto';
import { UpdateBuildingDto } from './dto/update-building.dto';
import { CreateApartmentDto } from './dto/create-apartment.dto';
import { UpdateApartmentDto } from './dto/update-apartment.dto';

@Injectable()
export class BuildingsService {
  constructor(private prisma: PrismaService) {}

  // ==================== BUILDINGS ====================

  async createBuilding(createBuildingDto: CreateBuildingDto, createdBy?: string) {
    const building = await this.prisma.building.create({
      data: {
        name: createBuildingDto.name,
        address: createBuildingDto.address,
        city: createBuildingDto.city,
        postalCode: createBuildingDto.postalCode,
        taxId: createBuildingDto.taxId,
        constructionYear: createBuildingDto.constructionYear,
        floors: createBuildingDto.floors,
        apartmentCount: createBuildingDto.apartmentCount,
        isActive: createBuildingDto.isActive ?? true,
      },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId: createdBy,
        action: 'CREATE',
        entity: 'Building',
        entityId: building.id,
        newValue: { building: building.name },
      },
    });

    return building;
  }

  async findAllBuildings() {
    return this.prisma.building.findMany({
      include: {
        _count: {
          select: {
            apartments: true,
            expenses: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findOneBuilding(id: string) {
    const building = await this.prisma.building.findUnique({
      where: { id },
      include: {
        apartments: {
          include: {
            owner: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
          },
          orderBy: [{ floor: 'asc' }, { number: 'asc' }],
        },
        _count: {
          select: {
            expenses: true,
            oilDeliveries: true,
            commonChargePeriods: true,
          },
        },
      },
    });

    if (!building) {
      throw new NotFoundException('Building not found');
    }

    return building;
  }

  async updateBuilding(id: string, updateBuildingDto: UpdateBuildingDto, updatedBy?: string) {
    const building = await this.prisma.building.findUnique({ where: { id } });

    if (!building) {
      throw new NotFoundException('Building not found');
    }

    const updatedBuilding = await this.prisma.building.update({
      where: { id },
      data: updateBuildingDto,
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId: updatedBy,
        action: 'UPDATE',
        entity: 'Building',
        entityId: id,
        oldValue: building,
        newValue: updatedBuilding,
      },
    });

    return updatedBuilding;
  }

  async removeBuilding(id: string, deletedBy?: string) {
    const building = await this.prisma.building.findUnique({ where: { id } });

    if (!building) {
      throw new NotFoundException('Building not found');
    }

    await this.prisma.building.delete({ where: { id } });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId: deletedBy,
        action: 'DELETE',
        entity: 'Building',
        entityId: id,
        oldValue: { building: building.name },
      },
    });

    return { message: 'Building deleted successfully' };
  }

  // ==================== APARTMENTS ====================

  async createApartment(createApartmentDto: CreateApartmentDto, createdBy?: string) {
    // Verify building exists
    const building = await this.prisma.building.findUnique({
      where: { id: createApartmentDto.buildingId },
    });

    if (!building) {
      throw new NotFoundException('Building not found');
    }

    // Check if apartment number already exists in this building
    const existingApartment = await this.prisma.apartment.findFirst({
      where: {
        buildingId: createApartmentDto.buildingId,
        number: createApartmentDto.number,
      },
    });

    if (existingApartment) {
      throw new ConflictException('Apartment number already exists in this building');
    }

    // Verify owner exists if provided
    if (createApartmentDto.ownerId) {
      const owner = await this.prisma.user.findUnique({
        where: { id: createApartmentDto.ownerId },
      });
      if (!owner) {
        throw new NotFoundException('Owner not found');
      }
    }

    const apartment = await this.prisma.apartment.create({
      data: {
        buildingId: createApartmentDto.buildingId,
        number: createApartmentDto.number,
        floor: createApartmentDto.floor,
        squareMeters: createApartmentDto.squareMeters,
        shareCommon: createApartmentDto.shareCommon ?? 0,
        shareElevator: createApartmentDto.shareElevator ?? 0,
        shareHeating: createApartmentDto.shareHeating ?? 0,
        shareSpecial: createApartmentDto.shareSpecial ?? 0,
        shareOwner: createApartmentDto.shareOwner ?? 0,
        shareOther: createApartmentDto.shareOther ?? 0,
        ownerId: createApartmentDto.ownerId,
        isOccupied: createApartmentDto.isOccupied ?? true,
        hasHeating: createApartmentDto.hasHeating ?? true,
      },
      include: {
        building: {
          select: {
            id: true,
            name: true,
          },
        },
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId: createdBy,
        action: 'CREATE',
        entity: 'Apartment',
        entityId: apartment.id,
        newValue: {
          building: building.name,
          apartment: apartment.number,
        },
      },
    });

    return apartment;
  }

  async findAllApartments(buildingId?: string) {
    const where = buildingId ? { buildingId } : {};

    return this.prisma.apartment.findMany({
      where,
      include: {
        building: {
          select: {
            id: true,
            name: true,
          },
        },
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: [{ buildingId: 'asc' }, { floor: 'asc' }, { number: 'asc' }],
    });
  }

  async findOneApartment(id: string) {
    const apartment = await this.prisma.apartment.findUnique({
      where: { id },
      include: {
        building: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        _count: {
          select: {
            oilMeasurements: true,
            commonChargeLines: true,
            payments: true,
          },
        },
      },
    });

    if (!apartment) {
      throw new NotFoundException('Apartment not found');
    }

    return apartment;
  }

  async updateApartment(id: string, updateApartmentDto: UpdateApartmentDto, updatedBy?: string) {
    const apartment = await this.prisma.apartment.findUnique({ where: { id } });

    if (!apartment) {
      throw new NotFoundException('Apartment not found');
    }

    const updatedApartment = await this.prisma.apartment.update({
      where: { id },
      data: updateApartmentDto,
      include: {
        building: {
          select: {
            id: true,
            name: true,
          },
        },
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId: updatedBy,
        action: 'UPDATE',
        entity: 'Apartment',
        entityId: id,
        oldValue: apartment,
        newValue: updatedApartment,
      },
    });

    return updatedApartment;
  }

  async removeApartment(id: string, deletedBy?: string) {
    const apartment = await this.prisma.apartment.findUnique({
      where: { id },
      include: {
        building: true,
      },
    });

    if (!apartment) {
      throw new NotFoundException('Apartment not found');
    }

    await this.prisma.apartment.delete({ where: { id } });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId: deletedBy,
        action: 'DELETE',
        entity: 'Apartment',
        entityId: id,
        oldValue: {
          building: apartment.building.name,
          apartment: apartment.number,
        },
      },
    });

    return { message: 'Apartment deleted successfully' };
  }
}
