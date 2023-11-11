import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';



import { MovieDetailPageComponent } from './movie-detail-page.component';
import {FastSvgModule} from '@push-based/ngx-fast-svg';

const routes: Routes = [
  {
    path: '',
    component: MovieDetailPageComponent,
  },
];

@NgModule({
    imports: [
    CommonModule,
    RouterModule.forChild(routes),
    FastSvgModule,
    MovieDetailPageComponent,
],
})
export class MovieDetailPageModule {}
