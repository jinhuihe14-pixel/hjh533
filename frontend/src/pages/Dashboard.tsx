import { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Table, Tag, Progress, List, Avatar } from 'antd';
import { 
  ShoppingCartOutlined, 
  ClockCircleOutlined, 
  CheckCircleOutlined,
  DollarOutlined,
  WarningOutlined,
  TruckOutlined,
  RiseOutlined,
  FallOutlined
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { dashboardApi } from '../services/api';
import { formatMoney, orderStatusMap, roleMap } from '../utils/format';
import { useAuthContext } from '../App';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';

const Dashboard = () => {
  const [stats, setStats] = useState<any>(null);
  const [orderTrend, setOrderTrend] = useState<any[]>([]);
  const [paymentTrend, setPaymentTrend] = useState<any[]>([]);
  const [supplierRanking, setSupplierRanking] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthContext();
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, trendData, paymentData, rankingData, ordersData] = await Promise.all([
        dashboardApi.getStats(),
        dashboardApi.getOrderTrend(),
        dashboardApi.getPaymentTrend(),
        dashboardApi.getSupplierRanking(),
        dashboardApi.getRecentOrders()
      ]);
      setStats(statsData);
      setOrderTrend(trendData);
      setPaymentTrend(paymentData);
      setSupplierRanking(rankingData);
      setRecentOrders(ordersData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const orderTrendOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['加工订单', '原料订单', '总计'] },
    grid: { left: 50, right: 20, top: 40, bottom: 30 },
    xAxis: {
      type: 'category',
      data: orderTrend.map(d => dayjs(d.date).format('MM-DD'))
    },
    yAxis: { type: 'value' },
    series: [
      {
        name: '加工订单',
        type: 'line',
        smooth: true,
        data: orderTrend.map(d => d.processingOrders),
        itemStyle: { color: '#1677ff' },
        areaStyle: { opacity: 0.1 }
      },
      {
        name: '原料订单',
        type: 'line',
        smooth: true,
        data: orderTrend.map(d => d.materialOrders),
        itemStyle: { color: '#52c41a' },
        areaStyle: { opacity: 0.1 }
      },
      {
        name: '总计',
        type: 'line',
        smooth: true,
        data: orderTrend.map(d => d.total),
        itemStyle: { color: '#722ed1' },
        areaStyle: { opacity: 0.1 }
      }
    ]
  };

  const paymentTrendOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['应收账款', '应付账款', '已付款'] },
    grid: { left: 50, right: 20, top: 40, bottom: 30 },
    xAxis: {
      type: 'category',
      data: paymentTrend.map(d => d.month)
    },
    yAxis: { 
      type: 'value',
      axisLabel: {
        formatter: (value: number) => value >= 10000 ? `${value/10000}万` : value
      }
    },
    series: [
      {
        name: '应收账款',
        type: 'bar',
        data: paymentTrend.map(d => d.receivable),
        itemStyle: { color: '#52c41a' }
      },
      {
        name: '应付账款',
        type: 'bar',
        data: paymentTrend.map(d => d.payable),
        itemStyle: { color: '#fa8c16' }
      },
      {
        name: '已付款',
        type: 'bar',
        data: paymentTrend.map(d => d.paid),
        itemStyle: { color: '#1677ff' }
      }
    ]
  };

  const statCards = stats ? [
    { title: '订单总数', value: stats.totalOrders, icon: <ShoppingCartOutlined />, color: '#1677ff' },
    { title: '待处理', value: stats.pendingOrders, icon: <ClockCircleOutlined />, color: '#fa8c16' },
    { title: '进行中', value: stats.processingOrders, icon: <RiseOutlined />, color: '#722ed1' },
    { title: '已完成', value: stats.completedOrders, icon: <CheckCircleOutlined />, color: '#52c41a' }
  ] : [];

  const financeCards = stats ? [
    { title: '订单总金额', value: formatMoney(stats.totalAmount), icon: <DollarOutlined />, color: '#13c2c2' },
    { title: '待收/付款', value: formatMoney(stats.pendingPayment), icon: <ClockCircleOutlined />, color: '#fa8c16' },
    { title: '已逾期', value: formatMoney(stats.overduePayment), icon: <WarningOutlined />, color: '#f5222d' },
    { title: '在途物流', value: stats.activeLogistics, icon: <TruckOutlined />, color: '#722ed1' }
  ] : [];

  const orderColumns = [
    {
      title: '订单号',
      dataIndex: 'orderNo',
      key: 'orderNo',
      render: (text: string, record: any) => (
        <a onClick={() => navigate(record.orderType === 'processing' 
          ? `/orders/processing/${record.id}` 
          : `/orders/material/${record.id}`)}
        >
          {text}
        </a>
      )
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (val: number) => formatMoney(val)
    },
    {
      title: '合作方',
      dataIndex: 'partnerName',
      key: 'partnerName'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const info = orderStatusMap[status as keyof typeof orderStatusMap] || { text: status, color: 'default' };
        return <Tag color={info.color}>{info.text}</Tag>;
      }
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (val: string) => dayjs(val).format('YYYY-MM-DD HH:mm')
    }
  ];

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">工作台</h2>
        <div style={{ color: '#8c8c8c', marginTop: 4 }}>
          欢迎回来，{user?.name}！今天是 {dayjs().format('YYYY年MM月DD日 dddd')}
        </div>
      </div>

      <div className="page-content">
        <Row gutter={[16, 16]}>
          {statCards.map((card, index) => (
            <Col span={6} key={index}>
              <Card>
                <Statistic
                  title={card.title}
                  value={card.value}
                  prefix={card.icon}
                  valueStyle={{ color: card.color }}
                />
              </Card>
            </Col>
          ))}
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          {financeCards.map((card, index) => (
            <Col span={6} key={index}>
              <Card>
                <Statistic
                  title={card.title}
                  value={card.value}
                  prefix={card.icon}
                  valueStyle={{ color: card.color, fontSize: 18 }}
                />
              </Card>
            </Col>
          ))}
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={16}>
            <Card title="订单趋势" className="card-shadow">
              <ReactECharts option={orderTrendOption} style={{ height: 300 }} />
            </Card>
          </Col>
          <Col span={8}>
            <Card title="供应商排名" className="card-shadow">
              <List
                size="small"
                dataSource={supplierRanking.slice(0, 5)}
                renderItem={(item, index) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<Avatar style={{ backgroundColor: index < 3 ? '#f5222d' : '#8c8c8c' }}>{index + 1}</Avatar>}
                      title={
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>{item.name}</span>
                          <Tag color={item.level === 'A' ? 'gold' : 'blue'}>{item.level}级</Tag>
                        </div>
                      }
                      description={
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 12, color: '#8c8c8c' }}>综合评分</span>
                            <span style={{ fontSize: 12, fontWeight: 500 }}>{item.rating}分</span>
                          </div>
                          <Progress percent={item.rating} size="small" showInfo={false} />
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={24}>
            <Card title="最近订单" className="card-shadow">
              <Table
                columns={orderColumns}
                dataSource={recentOrders}
                rowKey="id"
                pagination={false}
                size="small"
              />
            </Card>
          </Col>
        </Row>

        {stats?.warningCount > 0 && (
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col span={24}>
              <Card 
                title={
                  <span style={{ color: '#f5222d' }}>
                    <WarningOutlined /> 超时预警（{stats.warningCount}）
                  </span>
                } 
                className="card-shadow"
                style={{ borderColor: '#ffa39e' }}
              >
                <div style={{ color: '#f5222d' }}>
                  有 {stats.warningCount} 个订单节点已超时，请及时处理！
                </div>
              </Card>
            </Col>
          </Row>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
