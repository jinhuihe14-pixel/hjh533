import { useState, useEffect } from 'react';
import { Table, Card, Button, Input, Select, Tag, Space, message } from 'antd';
import { SearchOutlined, ReloadOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { ratingApi } from '../../services/api';
import { formatDate } from '../../utils/format';
import { RectificationNotice } from '../../types';

const { Option } = Select;

const RectificationList = () => {
  const [rectifications, setRectifications] = useState<RectificationNotice[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [status, setStatus] = useState('');
  const [period, setPeriod] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [keyword, setKeyword] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadRectifications();
  }, [page, pageSize, status, period, keyword]);

  const loadRectifications = async () => {
    setLoading(true);
    try {
      const params: any = { page, pageSize };
      if (status) params.status = status;
      if (period) params.period = period;
      if (keyword) params.keyword = keyword;

      const data = await ratingApi.getRectifications(params);
      setRectifications(data.records);
      setTotal(data.total);
    } catch (e) {
      console.error(e);
      message.error('加载整改通知列表失败');
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (statusVal: string) => {
    const statusMap: Record<string, { text: string; color: string }> = {
      pending: { text: '待处理', color: 'orange' },
      in_progress: { text: '处理中', color: 'blue' },
      submitted: { text: '已提交', color: 'cyan' },
      verified: { text: '已验证', color: 'green' },
      closed: { text: '已关闭', color: 'default' }
    };
    return statusMap[statusVal] || { text: statusVal, color: 'default' };
  };

  const getLevelColor = (levelVal: string) => {
    const colorMap: Record<string, string> = {
      A: '#f5222d',
      B: '#fa8c16',
      C: '#faad14'
    };
    return colorMap[levelVal] || '#8c8c8c';
  };

  const columns = [
    {
      title: '通知单号',
      dataIndex: 'noticeNo',
      key: 'noticeNo',
      render: (text: string, record: RectificationNotice) => (
        <a onClick={() => navigate(`/rating/rectifications/${record.id}`)}>{text}</a>
      )
    },
    {
      title: '供应商',
      dataIndex: 'supplierName',
      key: 'supplierName'
    },
    {
      title: '周期',
      dataIndex: 'period',
      key: 'period'
    },
    {
      title: '评级等级',
      dataIndex: 'ratingLevel',
      key: 'ratingLevel',
      render: (levelVal: string) => (
        <Tag color={getLevelColor(levelVal)} icon={<ExclamationCircleOutlined />}>
          {levelVal}级
        </Tag>
      )
    },
    {
      title: '得分',
      dataIndex: 'score',
      key: 'score',
      render: (val: number) => val
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (statusVal: string) => {
        const info = getStatusInfo(statusVal);
        return <Tag color={info.color}>{info.text}</Tag>;
      }
    },
    {
      title: '截止日期',
      dataIndex: 'deadline',
      key: 'deadline',
      render: (val: string) => formatDate(val)
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (val: string) => formatDate(val)
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: RectificationNotice) => (
        <Space>
          <Button type="link" size="small" onClick={() => navigate(`/rating/rectifications/${record.id}`)}>
            详情
          </Button>
        </Space>
      )
    }
  ];

  const statusOptions = [
    { value: '', label: '全部状态' },
    { value: 'pending', label: '待处理' },
    { value: 'in_progress', label: '处理中' },
    { value: 'submitted', label: '已提交' },
    { value: 'verified', label: '已验证' },
    { value: 'closed', label: '已关闭' }
  ];

  const periodOptions = [
    { value: '', label: '全部周期' },
    { value: '2026-05', label: '2026年05月' },
    { value: '2026-04', label: '2026年04月' },
    { value: '2026-03', label: '2026年03月' },
    { value: '2026-02', label: '2026年02月' },
    { value: '2026-01', label: '2026年01月' }
  ];

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="page-title">整改通知</h2>
        </div>
      </div>

      <div className="page-content">
        <Card className="card-shadow">
          <Space style={{ marginBottom: 16 }} size="large">
            <Input
              placeholder="搜索通知单号/供应商"
              prefix={<SearchOutlined />}
              style={{ width: 280 }}
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              allowClear
            />
            <Select
              placeholder="状态"
              style={{ width: 140 }}
              value={status || undefined}
              onChange={val => setStatus(val || '')}
              allowClear
            >
              {statusOptions.map(opt => (
                <Option key={opt.value} value={opt.value}>{opt.label}</Option>
              ))}
            </Select>
            <Select
              placeholder="评级周期"
              style={{ width: 150 }}
              value={period || undefined}
              onChange={val => setPeriod(val || '')}
              allowClear
            >
              {periodOptions.map(opt => (
                <Option key={opt.value} value={opt.value}>{opt.label}</Option>
              ))}
            </Select>
            <Button icon={<ReloadOutlined />} onClick={loadRectifications}>刷新</Button>
          </Space>

          <Table
            columns={columns}
            dataSource={rectifications}
            rowKey="id"
            loading={loading}
            pagination={{
              current: page,
              pageSize,
              total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (totalCount) => `共 ${totalCount} 条`,
              onChange: (p, ps) => {
                setPage(p);
                setPageSize(ps);
              }
            }}
          />
        </Card>
      </div>
    </div>
  );
};

export default RectificationList;
