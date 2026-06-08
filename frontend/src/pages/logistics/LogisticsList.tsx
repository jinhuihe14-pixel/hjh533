import { useState, useEffect } from 'react';
import { Table, Card, Button, Input, Select, Tag, Space, message } from 'antd';
import { SearchOutlined, ReloadOutlined, TruckOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { logisticsApi } from '../../services/api';
import { formatDate, logisticsStatusMap, formatDateTime } from '../../utils/format';
import { Logistics } from '../../types';

const { Option } = Select;

const LogisticsList = () => {
  const [logisticsList, setLogisticsList] = useState<Logistics[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [status, setStatus] = useState<string>('');
  const [keyword, setKeyword] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadLogistics();
  }, [page, pageSize, status, keyword]);

  const loadLogistics = async () => {
    setLoading(true);
    try {
      const params: any = { page, pageSize };
      if (status) params.status = status;
      if (keyword) params.keyword = keyword;
      
      const data = await logisticsApi.getLogisticsList(params);
      setLogisticsList(data.records);
      setTotal(data.total);
    } catch (e) {
      console.error(e);
      message.error('加载物流列表失败');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: '物流单号',
      dataIndex: 'trackingNo',
      key: 'trackingNo',
      render: (text: string, record: Logistics) => (
        <a onClick={() => navigate(`/logistics/${record.id}`)}>{text}</a>
      )
    },
    {
      title: '承运商',
      dataIndex: 'carrier',
      key: 'carrier'
    },
    {
      title: '发货方',
      dataIndex: 'senderName',
      key: 'senderName'
    },
    {
      title: '收货方',
      dataIndex: 'receiverName',
      key: 'receiverName'
    },
    {
      title: '发货地',
      dataIndex: 'origin',
      key: 'origin'
    },
    {
      title: '收货地',
      dataIndex: 'destination',
      key: 'destination'
    },
    {
      title: '当前位置',
      dataIndex: 'currentLocation',
      key: 'currentLocation',
      render: (val: string) => val || '-'
    },
    {
      title: '预计送达',
      dataIndex: 'estimatedDelivery',
      key: 'estimatedDelivery',
      render: (val: string) => formatDate(val)
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const info = logisticsStatusMap[status as keyof typeof logisticsStatusMap] || { text: status, color: 'default' };
        return <Tag color={info.color}>{info.text}</Tag>;
      }
    },
    {
      title: '异常',
      key: 'damage',
      render: (_: any, record: Logistics) => (
        record.damageReport ? (
          <Tag color="red" icon={<ExclamationCircleOutlined />}>
            {record.damageReport.status === 'resolved' ? '已理赔' : '理赔中'}
          </Tag>
        ) : null
      )
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Logistics) => (
        <Button type="link" icon={<TruckOutlined />} onClick={() => navigate(`/logistics/${record.id}`)}>
          追踪
        </Button>
      )
    }
  ];

  const statusOptions = [
    { value: '', label: '全部状态' },
    { value: 'pending', label: '待发货' },
    { value: 'picked_up', label: '已揽收' },
    { value: 'in_transit', label: '运输中' },
    { value: 'delivered', label: '已到达' },
    { value: 'signed', label: '已签收' },
    { value: 'rejected', label: '已拒收' },
    { value: 'damaged', label: '已破损' }
  ];

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">物流管理</h2>
      </div>

      <div className="page-content">
        <Card className="card-shadow">
          <Space style={{ marginBottom: 16 }} size="large">
            <Input
              placeholder="搜索物流单号/承运商"
              prefix={<SearchOutlined />}
              style={{ width: 280 }}
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              allowClear
            />
            <Select
              placeholder="物流状态"
              style={{ width: 150 }}
              value={status || undefined}
              onChange={val => setStatus(val || '')}
              allowClear
            >
              {statusOptions.map(opt => (
                <Option key={opt.value} value={opt.value}>{opt.label}</Option>
              ))}
            </Select>
            <Button icon={<ReloadOutlined />} onClick={loadLogistics}>刷新</Button>
          </Space>

          <Table
            columns={columns}
            dataSource={logisticsList}
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

export default LogisticsList;
