import { Type } from "class-transformer";
import { ArrayNotEmpty, IsArray, IsNotEmpty, IsNumber, IsString } from "class-validator";

export class MyModelDto {
    @IsNotEmpty()
    @IsNumber()
    id: number;

    
    @IsNotEmpty()
    @IsNumber()
    userId: number;

    
}
