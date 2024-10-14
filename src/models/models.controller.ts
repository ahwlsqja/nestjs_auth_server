import { Controller, Get, Post, Body, Patch, Param, Delete, Inject, UseInterceptors, ParseIntPipe } from '@nestjs/common';
import { ModelsService } from './models.service';
import { CreateModelDto } from './dto/create-model.dto';
import { UpdateModelDto } from './dto/update-model.dto';
import { ClientProxy, MessagePattern } from '@nestjs/microservices';
import { RBAC } from 'src/auth/decorator/rbac.decorator';
import { CacheInterceptor as CI } from '@nestjs/cache-manager'
import { Role } from 'src/user/entities/user.entity';
import { UserId } from 'src/user/decorator/user-id.decorator';
import { MyModelDto } from './dto/my-model-find.dto';

@Controller('models')
export class ModelsController {
  constructor(@Inject('ML_CRUD_QUEUE') private client: ClientProxy) {}


  //////////////////// 모델 생성 //////////////////////////
  @Post()
  @RBAC(Role.paidUser)
  async createModel(
    @Body() createModelDto: CreateModelDto,
    @UserId() userId: number,
  ) {
    createModelDto.userId = userId;
    return this.client.send({ cmd: 'create_model'}, createModelDto)
  }

  @MessagePattern('model_created')
  async handleModelCreated(data: any){
    console.log('모델이 생성되었습니다.', data)
  }

  @MessagePattern('model_creation_error')
  async handleModelCreationError(data: any){
    console.log('모델 생성 중 오류가 발생하였습니다.', data.error)
  }
  //////////////////////////////////////////////


  // 모든 모델 조회  //////////////////////////////////////////////
  @RBAC(Role.admin)
  @UseInterceptors(CI)
  @Get('recent')
  async findAll() {
    return this.client.send({ cmd: 'recent_model'}, {})
  }

  @MessagePattern('model_findRecent')
  async handleModelFindRecent(data: any){
    console.log('최근 모델을 불러왔습니다.', data)
  }

  @MessagePattern('model_findRecent_error')
  async handleModelFindRecentError(data: any){
    console.log('최근 모델을 불러오던 중 오류가 발생했습니다.', data.error)
  }
  //////////////////////////////////////////////



  /////////////////// 내 모델 조회 ///////////////////////////
  @Get()
  @RBAC(Role.paidUser)
  async getModel(@UserId() userId: number) {
    return this.client.send({ cmd: 'get_my_model' }, { userId });
  }

  @MessagePattern('my_model_find')
  async handleMyModelFind(data: any){
    console.log('내 모델을 불러왔습니다.', data)
  }

  @MessagePattern('my_model_find_error')
  async handleMyModelFindError(data: any){
    console.log('내 모델을 불러오던 중 오류가 발생했습니다.', data.error)
  }
  //////////////////////////////////////////////

  //////////////////// 내 특정 모델 조회 ////////////////////////
  @Get(':id')
  @RBAC(Role.paidUser)
  async getmyModelOne(
    @Param('id', ParseIntPipe) id: number,
    @UserId() userId: number,
  ){
    
    return this.client.send({ cmd: 'get_my_model_one' }, id)
  }


  @MessagePattern('my_model_find')
  async handleMyModelOneFind(data: any){
    console.log('모델을 불러왔습니다.', data)
  }

  @MessagePattern('my_model_find_error')
  async handleMyModelOneFindError(data: any){
    console.log('모델을 불러오던 중 오류가 발생했습니다.', data.error)
  }
  //////////////////////////////////////////////

  //////////////////// 내 모델 수정 ////////////////////////
  @Patch(':id')
  @RBAC(Role.paidUser)
  async updateModel(
    @Param('id', ParseIntPipe) id: number, 
    @Body() createModelDto: CreateModelDto) {
      const updateModelDto : UpdateModelDto = {
        id,
        ...createModelDto
      }

    return this.client.send({ cmd: 'update_model' }, { updateModelDto });
  }

  @MessagePattern('updated_model')
  async handleUpdate(data: any){
    console.log('모델 정보를 업데이트 했습니다.', data)
  }

  @MessagePattern('update_model_error')
  async handleUpdateError(data: any){
    console.log('모델을 정보를 불러오던중 오류가 발생했습니다.', data.error)
  }


  //////////////////////////////////////////////
  
  @Delete(':id')
  @RBAC(Role.paidUser)
  async deleteModel(
    @Param('id', ParseIntPipe) id: number) {
    return this.client.send({ cmd: 'delete_model' }, { id });
  }


  @MessagePattern('updated_model')
  async handleDelete(data: any){
    console.log('모델을 삭제했습니다.', data)
  }

  @MessagePattern('update_model_error')
  async handleDeleteError(data: any){
    console.log('모델을 삭제하던중 오류가 발생했습니다.', data.error)
  }
}
