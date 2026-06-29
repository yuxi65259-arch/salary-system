<template>
  <el-container style="height: 100vh">
    <el-aside width="220px" class="no-print sidebar">
      <div class="logo">
        <h2>工资管理系统</h2>
      </div>
      <el-menu
        :default-active="activeMenu"
        router
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409EFF"
      >
        <el-menu-item index="/dashboard">
          <el-icon><DataBoard /></el-icon>
          <span>仪表盘</span>
        </el-menu-item>
        <el-menu-item index="/workers">
          <el-icon><User /></el-icon>
          <span>工人管理</span>
        </el-menu-item>
        <el-menu-item index="/processes">
          <el-icon><Setting /></el-icon>
          <span>工序管理</span>
        </el-menu-item>
        <el-menu-item index="/config">
          <el-icon><Tools /></el-icon>
          <span>工资配置</span>
        </el-menu-item>
        <el-menu-item index="/piece-records">
          <el-icon><Edit /></el-icon>
          <span>计件录入</span>
        </el-menu-item>
        <el-menu-item index="/attendance">
          <el-icon><Calendar /></el-icon>
          <span>考勤管理</span>
        </el-menu-item>
        <el-menu-item index="/allowances">
          <el-icon><Coin /></el-icon>
          <span>补贴/扣款</span>
        </el-menu-item>
        <el-menu-item index="/calculator">
          <el-icon><Operation /></el-icon>
          <span>工资计算</span>
        </el-menu-item>
        <el-menu-item index="/reports">
          <el-icon><Document /></el-icon>
          <span>工资报表</span>
        </el-menu-item>
        <el-menu-item index="/datamgmt">
          <el-icon><FolderOpened /></el-icon>
          <span>数据管理</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="header-actions" style="height: 50px">
        <el-breadcrumb separator="/">
          <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
          <el-breadcrumb-item v-if="pageTitle">{{ pageTitle }}</el-breadcrumb-item>
        </el-breadcrumb>
        <span style="margin-left: auto; color: #909399; font-size: 13px">
          工厂工资管理系统 v1.0
        </span>
      </el-header>

      <el-main style="padding: 20px">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const activeMenu = computed(() => route.path)
const pageTitle = computed(() => route.meta?.title || '')
</script>

<style scoped>
.logo {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #263445;
}
.logo h2 {
  color: #fff;
  font-size: 17px;
  font-weight: 600;
  letter-spacing: 2px;
}
.el-aside {
  background-color: #304156;
  overflow-x: hidden;
}
.el-menu {
  border-right: none;
}
.el-header {
  background: #fff;
  display: flex;
  align-items: center;
  border-bottom: 1px solid #e6e6e6;
  padding: 0 20px;
}
</style>
