import React from 'react';
import { Layout, Menu, Typography } from 'antd';
import {
  DashboardOutlined,
  SwapOutlined,
  MoneyCollectOutlined,
} from '@ant-design/icons';

const { Sider } = Layout;
const { Title } = Typography;

const menuItems = [
  { key: '1', icon: <DashboardOutlined />, label: 'Dashboard' },
  { key: '2', icon: <SwapOutlined />, label: 'Mutasi' },
  { key: '3', icon: <MoneyCollectOutlined />, label: 'Hutang/Piutang' },
];

const SideMenu = ({ collapsed, onCollapse, onMenuSelect, activeKey }) => {
  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={onCollapse}
      width={240}
      collapsedWidth={64}
      theme="dark" // Dark theme for Sider
    >
      <div
        style={{
          height: 32,
          margin: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}
      >
        <MoneyCollectOutlined style={{ fontSize: '24px', color: 'white' }}/>
        {!collapsed && <Title level={5} style={{ marginBottom: 0, color: 'white' }}>Fgan Finance</Title>}
      </div>
      <Menu
        theme="dark" // Dark theme for Menu
        selectedKeys={[activeKey]}
        mode="inline"
        items={menuItems}
        onClick={({ key }) => onMenuSelect(key)}
      />
    </Sider>
  );
};

export default SideMenu;
