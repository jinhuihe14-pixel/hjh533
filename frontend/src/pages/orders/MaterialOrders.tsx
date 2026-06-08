import { useState, useEffect } from 'react';
import { Table, Card, Button, Input, Select, Tag, Space, message } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { orderApi } from '../../services/api';
import { formatMoney, formatDate, orderStatusMap } from '../../utils/format';
import { MaterialOrder } from '../../types';
import { useAuthContext } from '../../App';

const { Option } = Select;

const MaterialOrders = () => {
  const [orders, setOrders] = useState<MaterialOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [status, setStatus] = useState<string>('');
  const [keyword, setKeyword] = useState('');
  const navigate = useNavigate();
  const { user } = useAuthContext();

  useEffect(() => {
    loadOrders();
  }, [page, pageSize, status, keyword]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const params: any = { page, pageSize };
      if (status) params.status = status;
      if (keyword) params.keyword = keyword;
      
      const data = await orderApi.getMaterialOrders(params);
      setOrders(data.records);
      setTotal(data.total);
    } catch (e) {
      console.error(e);
      message.error('加载订单列表失败');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: '订单编号',
      dataIndex: 'orderNo',
      key: 'orderNo',
      render: (text: string, record: MaterialOrder) => (
        <a onClick={() => navigate(`/orders/material/${record.id}`)}>{text}</a>
      )
    },
    {
      title: '物料名称',
      dataIndex: 'materialName',
      key: 'materialName'
    },
    {
      title: '物料编号',
      dataIndex: 'materialCode',
      key: 'materialCode'
    },
    {
      title: '规格型号',
      dataIndex: 'specification',
      key: 'specification'
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (val: number, record: MaterialOrder) => `${val} ${record.unit}`
    },
    {
      title: '单价',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      render: (val: number) => formatMoney(val)
    },
    {
      title: '总金额',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (val: number) => formatMoney(val)
    },
    {
      title: user?.role === 'supplier' ? '需求方' : '供应商',
      dataIndex: user?.role === 'supplier' ? 'demanderName' : 'supplierName',
      key: 'partner'
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
      title: '交货日期',
      dataIndex: 'deliveryDate',
      key: 'deliveryDate',
      render: (val: string) => formatDate(val)
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: MaterialOrder) => (
        <Button type="link" onClick={() => navigate(`/orders/material/${record.id}`)}>
          查看详情
        </Button>
      )
    }
  ];

  const statusOptions = [
    { value: '', label: '全部状态' },
    { value: 'pending_review', label: '待审核' },
    { value: 'reviewed', label: '已确认' },
    { value: 'shipped', label: '已发货' },
    { value: 'delivered', label: '已送达' },
    { value: 'completed', label: '已完成' }
  ];

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">原料订单</h2>
      </div>

      <div className="page-content">
        <Card className="card-shadow">
          <Space style={{ marginBottom: 16 }} size="large">
            <Input
              placeholder="搜索订单号/物料名称/编号"
              prefix={<SearchOutlined />}
              style={{ width: 280 }}
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              allowClear
            />
            <Select
              placeholder="订单状态"
              style={{ width: 150 }}
              value={status || undefined}
              onChange={val => setStatus(val || '')}
              allowClear
            >
              {statusOptions.map(opt => (
                <Option key={opt.value} value={opt.value}>{opt.label}</Option>
              ))}
            </Select>
            <Button icon={<ReloadOutlined />} onClick={loadOrders}>刷新</Button>
          </Space>

          <Table
            columns={columns}
            dataSource={orders}
            rowKey="id"
            loading={loading}
            pagination={{
              current: page,
              pageSize,
              total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条`,
              onChange: (page, pageSize) => {
                setPage(page);
                setPageSize(pageSize);
              }
            }}
          />
        </Card>
      </div>
    </div>
  );
};

export default MaterialOrders;
