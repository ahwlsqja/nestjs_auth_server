import { Exclude } from "class-transformer";
import { BaseTable } from "src/common/entity/base-table.entity";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

export enum Role{
    admin,
    paidUser,
}

@Entity()
export class User extends BaseTable{
    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        unique: true,
    })
    email: string

    @Column()
    @Exclude({
        // 응답보낼떄 안보냄
        toPlainOnly: true,
    })
    password: string;

    @Column({
        enum: Role,
        default: Role.paidUser // Role === 1
    })
    role: Role
}
