import { PartialType } from '@nestjs/mapped-types';
import { CreateModelDto } from './create-model.dto';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class UpdateModelDto extends PartialType(CreateModelDto) {
    @IsNotEmpty()
    @IsNumber()
    id: number;
}
