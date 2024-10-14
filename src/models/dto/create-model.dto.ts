import { Type } from "class-transformer";
import { ArrayNotEmpty, IsArray, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class CreateModelDto {
    @IsOptional()
    @IsNumber()
    userId?: number;

    @IsNotEmpty()
    @IsString()
    detail: string;
}
