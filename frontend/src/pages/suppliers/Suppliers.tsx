import { useState, useEffect } from 'react';
import { Table, Card, Button, Input, Select, Tag, Space, message, Rate, Avatar } from 'antd';
import { SearchOutlined, ReloadOutlined, ShopOutlined, StarOutlined, TrophyOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { supplierApi } from '../../services/api';
import { formatDate, roleMap } from '../../utils/format';
import { Company } from '../../types';

const { Option } = Select;

const Suppliers = () => {
  const [suppliers, setSuppliers] = useState<Company[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [type, setType] = useState<string>('');
  const [keyword, setKeyword] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadSuppliers();
  }, [page, pageSize, type, keyword]);

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const params: any = { page, pageSize };
      if (type) params.type = type;
      if (keyword) params.keyword = keyword;
      
      const data = await supplierApi.getSuppliers(params);
      setSuppliers(data.records);
      setTotal(data.total);
    } catch (e) {
      console.error(e);
      message.error('加载供应商列表失败');
    } finally {
      setLoading(false);
    }
  };

  const getLevelColor = (level?: string) => {
    const colorMap: Record<string, string> = {
      A: '#f5222d',
      B: '#fa8c16',
      C: '#faad14',
      D: '#8c8c8c'
    };
    return colorMap[level || 'D'] || '#8c8c8c';
  };

  const columns = [
    {
      title: '供应商名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Company) => (
        <Space>
          <Avatar size="small" icon={<ShopOutlined />} style={{ backgroundColor: '#1890ff' }} />
          <a onClick={() => navigate(`/suppliers/${record.id}`)}>{text}</a>
        </Space>
      )
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const label = roleMap[type] || type;
        const colorMap: Record<string, string> = {
          supplier: 'blue',
          factory: 'green'
        };
        return <Tag color={colorMap[type] || 'default'}>{label}</Tag>;
      }
    },
    {
      title: '联系人',
      dataIndex: 'contactPerson',
      key: 'contactPerson'
    },
    {
      title: '联系电话',
      dataIndex: 'contactPhone',
      key: 'contactPhone'
    },
    {
      title: '地址',
      dataIndex: 'address',
      key: 'address',
      ellipsis: true
    },
    {
      title: '信用等级',
      dataIndex: 'creditLevel',
      key: 'creditLevel',
      render: (level?: string) => level || '-'
    },
    {
      title: '最新评级',
      key: 'rating',
      render: (_: any, record: Company) => {
        if (!record.latestRating) return '-';
        const r = record.latestRating;
        return (
          <Space direction="vertical" size={0}>
            <Space>
              <Tag color={getLevelColor(r.level)} style={{ margin: 0 }}>
                <TrophyOutlined /> {r.level}级
              </Tag>
            </Space>
            <div style={{ fontSize: 12, color: '#999' }}>
              综合 {r.overallScore}分
            </div>
          </Space>
        );
      }
    },
    {
      title: '合作订单',
      dataIndex: 'orderCount',
      key: 'orderCount',
      render: (val?: number) => `${val || 0} 单`
    },
    {
      title: '入驻时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (val: string) => formatDate(val)
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Company) => (
        <Space>
          <Button type="link" onClick={() => navigate(`/suppliers/${record.id}`)}>
            详情
          </Button>
          <Button type="link" onClick={() => navigate(`/suppliers/price-compare?supplierId=${record.id}`)}>
            报价
          </Button>
        </Space>
      )
    }
  ];

  const typeOptions = [
    { value: '', label: '全部类型' },
    { value: 'supplier', label: '原料供应商' },
    { value: 'factory', label: '加工厂' }
  ];

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="page-title">供应商管理</h2>
          <Button type="primary" onClick={() => navigate('/suppliers/price-compare')}>
            智能比价
          </Button>
        </div>
      </div>

      <div className="page-content">
        <Card className="card-shadow">
          <Space style={{ marginBottom: 16 }} size="large">
            <Input
              placeholder="搜索供应商名称/联系人"
              prefix={<SearchOutlined />}
              style={{ width: 280 }}
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              allowClear
            />
            <Select
              placeholder="供应商类型"
              style={{ width: 150 }}
              value={type || undefined}
              onChange={val => setType(val || '')}
              allowClear
            >
              {typeOptions.map(opt => (
                <Option key={opt.value} value={opt.value}>{opt.label}</Option>
              ))}
            </Select>
            <Button icon={<ReloadOutlined />} onClick={loadSuppliers}>刷新</Button>
          </Space>

          <Table
            columns={columns}
            dataSource={suppliers}
            rowKey="id"
            loading={loading}
            pagination={{
              current: page,
              pageSize,
              total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 家`,
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

export default Suppliers;
