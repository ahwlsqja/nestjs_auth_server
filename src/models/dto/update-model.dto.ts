import { PartialType } from '@nestjs/mapped-types';
import { CreateModelDto } from './create-model.dto';
import { IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class UpdateModelDto extends PartialType(CreateModelDto) {
    @IsOptional()
    @IsNotEmpty()
    @IsNumber()
    id: number;
}
