import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userReposity: Repository<User>
  ){}
  create(createUserDto: CreateUserDto) {
    return this.userReposity.save(createUserDto)
  }

  findAll() {
    return this.userReposity.find()
  }

  async findOne(id: number) {
    const user = await this.userReposity.findOne({
      where: {
        id,
      }
    })
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const user = await this.userReposity.findOne({
      where: {
        id,
      }
    });

    if(!user){
      throw new NotFoundException(`${id}를 가진 사용자는 존재하지 않는 사용자입니다!`);
    }

    await this.userReposity.update(
      {id},
      updateUserDto,
    );

    return this.userReposity.findOne({
      where: {
        id,
      }
    });
  }

  remove(id: number) {
    return this.userReposity.delete(id);
  }
}
