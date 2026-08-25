import { PrismaService } from '../../../../core/prisma/prisma.service';
import { Prisma } from '@prisma/client';
export declare class UsersRepository {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<{
        id: string;
        name: string | null;
        email: string;
        createdAt: Date;
    }[]>;
    findByEmail(email: string): Promise<{
        id: string;
        name: string | null;
        email: string;
        password: string;
        isActive: boolean;
        lastLogin: Date | null;
        role: string;
        createdAt: Date;
        updatedAt: Date;
        deletedAt: Date | null;
        tenantId: string | null;
    } | null>;
    findById(id: string): Promise<{
        id: string;
        name: string | null;
        email: string;
        createdAt: Date;
    } | null>;
    create(data: Prisma.UserCreateInput): Promise<{
        id: string;
        name: string | null;
        email: string;
        createdAt: Date;
    }>;
    update(id: string, data: Prisma.UserUpdateInput): Promise<{
        id: string;
        name: string | null;
        email: string;
        updatedAt: Date;
    }>;
}
