import { Type } from "class-transformer";
import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, Matches } from "class-validator";

export class CreateModelDto {
    @IsNotEmpty()
    @IsNumber()
    userId: number;

    @IsNotEmpty()
    @IsString()
    detail: string;

    @IsArray()
    @ArrayNotEmpty()
    @IsString({ each: true })
    @Matches(/^010-\d{4}-\d{4}$/, { each: true, message: '전화번호는 010-xxxx-xxxx 형식이여야 합니다!'})
    @ArrayMaxSize(3)
    modelPhones: string[];
}
